from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
import stripe
import os
from database import get_db
from middleware.auth import verify_token
from models import User

router = APIRouter()
security = HTTPBearer()
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

class CreatePaymentIntentRequest(BaseModel):
    amount: int
    currency: str = "eur"
    shippingInfo: dict = None
    shippingCost: float = 0.0

class ConfirmPaymentRequest(BaseModel):
    paymentIntentId: str

@router.post("/create-payment-intent")
async def create_payment_intent(
    request: CreatePaymentIntentRequest,
    user: User = Depends(verify_token),
    db: Session = Depends(get_db)
):
    metadata = {"userId": str(user.id)}
    
    if request.shippingInfo:
        metadata.update({
            "firstName": request.shippingInfo.get("firstName", ""),
            "lastName": request.shippingInfo.get("lastName", ""),
            "email": request.shippingInfo.get("email", ""),
            "phone": request.shippingInfo.get("phone", ""),
            "address": request.shippingInfo.get("address", ""),
            "city": request.shippingInfo.get("city", ""),
            "postalCode": request.shippingInfo.get("postalCode", ""),
            "country": request.shippingInfo.get("country", "France")
        })
    
    if request.shippingCost:
        metadata["shippingCost"] = str(request.shippingCost)
    
    try:
        payment_intent = stripe.PaymentIntent.create(
            amount=request.amount,
            currency=request.currency,
            metadata=metadata,
            automatic_payment_methods={
                "enabled": True,
                "allow_redirects": "always"
            }
        )
        
        return {"clientSecret": payment_intent.client_secret}
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la création de l'intention de paiement: {str(e)}"
        )

@router.post("/confirm-payment")
async def confirm_payment(
    request: ConfirmPaymentRequest,
    user: User = Depends(verify_token),
    db: Session = Depends(get_db)
):
    try:
        payment_intent = stripe.PaymentIntent.retrieve(request.paymentIntentId)
        
        if payment_intent.metadata.get("userId") != str(user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Non autorisé"
            )
        
        return {"status": payment_intent.status}
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la confirmation du paiement: {str(e)}"
        )

