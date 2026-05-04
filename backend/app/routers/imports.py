import os
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.config import settings
from app.db import get_db
from app.models.import_log import ImportLog
from app.models.set import Set
from app.models.user import User
from app.schemas.import_log import ImportLogRead, ImportSummary
from app.services.importer import import_tab_file

router = APIRouter(prefix="/imports", tags=["imports"])


@router.post("", response_model=ImportSummary)
async def upload_import(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ImportSummary:
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    tmp_path = upload_dir / f"tmp_{file.filename}"
    with open(tmp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        summary = await import_tab_file(tmp_path, file.filename or "upload.tab", current_user.id, db)
    except Exception as e:
        tmp_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=f"Import fehlgeschlagen: {e}") from e

    # Rename to import_id for permanent storage
    if summary.import_id:
        final_path = upload_dir / f"{summary.import_id}.tab"
        shutil.move(str(tmp_path), str(final_path))
    else:
        tmp_path.unlink(missing_ok=True)

    return summary


@router.get("", response_model=list[ImportLogRead])
async def list_imports(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ImportLogRead]:
    result = await db.execute(
        select(ImportLog).where(ImportLog.user_id == current_user.id).order_by(ImportLog.imported_at.desc())
    )
    return [ImportLogRead.model_validate(i) for i in result.scalars().all()]


@router.get("/{import_id}", response_model=ImportLogRead)
async def get_import(
    import_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ImportLogRead:
    result = await db.execute(
        select(ImportLog).where(ImportLog.id == import_id, ImportLog.user_id == current_user.id)
    )
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Import nicht gefunden")
    return ImportLogRead.model_validate(log)


@router.delete("/{import_id}", status_code=204)
async def delete_import(
    import_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(ImportLog).where(ImportLog.id == import_id, ImportLog.user_id == current_user.id)
    )
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Import nicht gefunden")

    await db.execute(delete(Set).where(Set.import_id == import_id))
    await db.delete(log)
    await db.commit()
