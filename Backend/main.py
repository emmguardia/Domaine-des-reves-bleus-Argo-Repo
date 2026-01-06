from fastapi import FastAPI, Request, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse, Response, PlainTextResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
import os
import stripe
from contextlib import asynccontextmanager
from database import engine, Base, get_db
from sqlalchemy.orm import Session
from sqlalchemy import text, inspect
import uvicorn

from routes import auth, payment, cart, user, admin, products, addresses, categories, upload
from models import User, Order, Cart, CartItem, OrderItem, OrderStatus, PaymentStatus

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
stripe_webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app: FastAPI):
    
    Base.metadata.create_all(bind=engine)
    
    try:
        with engine.connect() as conn:
            try:
                conn.execute(text("SELECT default_address FROM users LIMIT 1"))
            except Exception:
                conn.execute(text("ALTER TABLE users ADD COLUMN default_address TEXT NULL"))
                conn.commit()
    except Exception:
        pass
    
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
    allow_origins=["*"],
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

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=app.title + " - Swagger UI",
        oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
    )

@app.get("/openapi.json", include_in_schema=False)
async def get_openapi_endpoint():
    return get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

@app.get("/sitemap.xml", include_in_schema=False)
async def sitemap():
    from datetime import datetime
    today = datetime.now().strftime("%Y-%m-%dT10:00:00+00:00")
    sitemap_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  <url>
    <loc>https://domainedesrevesbleus.eu/</loc>
    <lastmod>{today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://domainedesrevesbleus.eu/products</loc>
    <lastmod>{today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://domainedesrevesbleus.eu/services</loc>
    <lastmod>{today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://domainedesrevesbleus.eu/contact</loc>
    <lastmod>{today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://domainedesrevesbleus.eu/metion-legale</loc>
    <lastmod>{today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://domainedesrevesbleus.eu/cgv</loc>
    <lastmod>{today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://domainedesrevesbleus.eu/politique-de-confidentialite</loc>
    <lastmod>{today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>"""
    return Response(
        content=sitemap_content,
        media_type="application/xml; charset=utf-8",
        status_code=200,
        headers={
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET",
        }
    )

@app.get("/robots.txt", include_in_schema=False)
async def robots():
    robots_content = """User-agent: *
Allow: /

User-agent: Googlebot
Allow: /
Allow: /products
Allow: /services
Allow: /contact
Allow: /metion-legale
Allow: /cgv
Allow: /politique-de-confidentialite
Allow: /sitemap.xml
Allow: /robots.txt

User-agent: *
Disallow: /login
Disallow: /register
Disallow: /reset-password
Disallow: /profile
Disallow: /checkout
Disallow: /order-confirmation
Disallow: /admin-panel
Disallow: /admin-panel/
Disallow: /api/

Sitemap: https://domainedesrevesbleus.eu/sitemap.xml
"""
    return PlainTextResponse(
        content=robots_content,
        headers={
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
        }
    )

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(payment.router, prefix="/api/payment", tags=["payment"])
app.include_router(cart.router, prefix="/api/cart", tags=["cart"])
app.include_router(user.router, prefix="/api/user", tags=["user"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(addresses.router, prefix="/api/addresses", tags=["addresses"])
app.include_router(categories.router, prefix="/api/admin/categories", tags=["categories"])
app.include_router(upload.router, prefix="/api/admin/upload", tags=["upload"])

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
