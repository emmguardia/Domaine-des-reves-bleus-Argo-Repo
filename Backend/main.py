from fastapi import FastAPI, Request, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import os
import stripe
from contextlib import asynccontextmanager
from database import engine, Base, get_db
from sqlalchemy.orm import Session
from sqlalchemy import text
import uvicorn

from routes import auth, payment, cart, user, admin, products
from models import User, Order, Cart, CartItem, OrderItem, OrderStatus, PaymentStatus

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
stripe_webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title="Domaine des Rêves Bleus API",
    description="Backend API pour l'e-commerce de toilettage canin",
    version="1.0.0",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://domainedesrevesbleus.famillemntmata.eu",
        "http://localhost:5173",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]
)

security = HTTPBearer()

@app.get("/api")
async def root():
    return {"message": "Backend Les Rêves Bleus est en ligne !"}

@app.get("/api/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    
    try:
        account = stripe.Account.retrieve()
        stripe_ok = True
        stripe_account_id = account.id
    except Exception:
        stripe_ok = False
        stripe_account_id = None
    
    return {
        "ok": db_status == "connected" and stripe_ok,
        "database": {"state": db_status},
        "stripe": {"ok": stripe_ok, "account": stripe_account_id}
    }

@app.post("/api/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, stripe_webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    if event.type == "payment_intent.succeeded":
        payment_intent = event.data.object
        payment_intent_id = payment_intent.id
        user_id = payment_intent.metadata.get("userId")
        
        existing_order = db.query(Order).filter(
            Order.payment_intent_id == payment_intent_id
        ).first()
        
        if existing_order:
            return JSONResponse(status_code=200, content={"received": True})
        
        if not user_id:
            return JSONResponse(status_code=200, content={"received": True})
        
        cart = db.query(Cart).filter(Cart.user_id == int(user_id)).first()
        if not cart:
            return JSONResponse(status_code=200, content={"received": True})
        
        cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.id).all()
        if not cart_items:
            return JSONResponse(status_code=200, content={"received": True})
        
        total_amount = payment_intent.amount / 100
        shipping_cost = float(payment_intent.metadata.get("shippingCost", "0"))
        
        shipping_address = {
            "first_name": payment_intent.metadata.get("firstName", ""),
            "last_name": payment_intent.metadata.get("lastName", ""),
            "email": payment_intent.metadata.get("email", ""),
            "phone": payment_intent.metadata.get("phone", ""),
            "address": payment_intent.metadata.get("address", ""),
            "city": payment_intent.metadata.get("city", ""),
            "postal_code": payment_intent.metadata.get("postalCode", ""),
            "country": payment_intent.metadata.get("country", "France")
        }
        
        new_order = Order(
            user_id=int(user_id),
            payment_intent_id=payment_intent_id,
            total_amount=total_amount,
            shipping_cost=shipping_cost,
            shipping_address=shipping_address,
            status=OrderStatus.PAID,
            payment_status=PaymentStatus.SUCCEEDED
        )
        
        db.add(new_order)
        db.flush()
        
        for item in cart_items:
            order_item = OrderItem(
                order_id=new_order.id,
                product_id=None,
                name=item.name,
                price=item.price,
                quantity=item.quantity,
                image=item.image,
                volume=item.volume,
                fragrance=item.fragrance,
                weight_grams=item.weight_grams or 100
            )
            db.add(order_item)
        
        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
        db.commit()
        
    elif event.type == "payment_intent.payment_failed":
        pass
    
    return JSONResponse(status_code=200, content={"received": True})

@app.get("/api/get-payment-status")
@limiter.limit("100/minute")
async def get_payment_status(
    request: Request,
    payment_intent: str,
    db: Session = Depends(get_db)
):
    if not payment_intent.startswith("pi_"):
        raise HTTPException(status_code=400, detail="Invalid payment_intent format")
    
    try:
        payment_intent_obj = stripe.PaymentIntent.retrieve(payment_intent)
        return {"status": payment_intent_obj.status}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sitemap.xml")
async def sitemap():
    sitemap_content = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://domainedesrevesbleus.eu/</loc>
    <lastmod>2025-12-20</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://domainedesrevesbleus.eu/products</loc>
    <lastmod>2025-12-20</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://domainedesrevesbleus.eu/services</loc>
    <lastmod>2025-12-20</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://domainedesrevesbleus.eu/contact</loc>
    <lastmod>2025-12-20</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://domainedesrevesbleus.eu/metion-legale</loc>
    <lastmod>2025-12-20</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://domainedesrevesbleus.eu/cgv</loc>
    <lastmod>2025-12-20</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://domainedesrevesbleus.eu/politique-de-confidentialite</loc>
    <lastmod>2025-12-20</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>"""
    return Response(content=sitemap_content, media_type="application/xml")

@app.get("/robots.txt")
async def robots():
    robots_content = """# robots.txt pour Les Rêves Bleus - Toilettage Canin
# https://domainedesrevesbleus.eu

User-agent: *
Allow: /
Allow: /products
Allow: /services
Allow: /contact
Allow: /metion-legale
Allow: /cgv
Allow: /politique-de-confidentialite

# Pages privées à ne pas indexer
Disallow: /login
Disallow: /register
Disallow: /reset-password
Disallow: /profile
Disallow: /checkout
Disallow: /order-confirmation
Disallow: /admin-panel
Disallow: /admin-panel/

# API et ressources techniques
Disallow: /api/
Disallow: /assets/

# Sitemap
Sitemap: https://domainedesrevesbleus.eu/sitemap.xml

# Crawl-delay (optionnel, pour éviter de surcharger le serveur)
Crawl-delay: 1
"""
    return Response(content=robots_content, media_type="text/plain")

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(payment.router, prefix="/api/payment", tags=["payment"])
app.include_router(cart.router, prefix="/api/cart", tags=["cart"])
app.include_router(user.router, prefix="/api/user", tags=["user"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(products.router, prefix="/api/products", tags=["products"])

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

