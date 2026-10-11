from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserLogin, TokenOut, UserOut
from app.core.security import verify_password, create_access_token
from app.api.deps import get_current_user

auth_router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@auth_router.post("/login", response_model=TokenOut)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    query = select(User).where(User.email == credentials.email)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is inactive")

    token = create_access_token(subject=user.email, role=user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@auth_router.get("/me", response_model=UserOut)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return current_user
