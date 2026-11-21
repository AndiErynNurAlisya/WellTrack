import pytest
from pydantic import ValidationError

from app.core.config import settings
from app.core.scheduler import REMINDER_MESSAGES
from app.schemas.reminder import (
    PushSubscriptionCreate,
    VapidPublicKeyResponse,
)


def test_vapid_settings_terkonfigurasi():
    # Memastikan kunci VAPID dan email klaim terisi
    assert settings.VAPID_PUBLIC_KEY is not None
    assert len(settings.VAPID_PUBLIC_KEY) > 20
    assert settings.VAPID_PRIVATE_KEY is not None
    assert len(settings.VAPID_PRIVATE_KEY) > 20
    assert settings.VAPID_CLAIMS_EMAIL.startswith("mailto:")


def test_vapid_public_key_response_schema():
    res = VapidPublicKeyResponse(public_key="test_public_key_abc123")
    assert res.public_key == "test_public_key_abc123"


def test_push_subscription_schema_valid():
    payload = {
        "endpoint": "https://fcm.googleapis.com/fcm/send/sample-token",
        "keys": {
            "p256dh": "BNfzFQbhDO75Ma7ZKoHydei0_sample_key",
            "auth": "sample_auth_token",
        },
    }
    sub = PushSubscriptionCreate(**payload)
    assert str(sub.endpoint) == "https://fcm.googleapis.com/fcm/send/sample-token"
    assert sub.keys.p256dh == "BNfzFQbhDO75Ma7ZKoHydei0_sample_key"
    assert sub.keys.auth == "sample_auth_token"


def test_push_subscription_schema_tanpa_endpoint_invalid():
    # Field endpoint wajib ada (tidak boleh dihilangkan)
    with pytest.raises(ValidationError):
        PushSubscriptionCreate.model_validate(
            {"keys": {"p256dh": "key", "auth": "auth"}}
        )


def test_push_subscription_schema_tanpa_keys_invalid():
    # Field keys wajib ada (tidak boleh dihilangkan)
    with pytest.raises(ValidationError):
        PushSubscriptionCreate.model_validate(
            {"endpoint": "https://push.service.com/sample"}
        )


def test_reminder_scheduler_template_pesan():
    # Memastikan semua kategori pengingat memiliki pesan judul & badan
    kategori_wajib = ["air", "tidur", "aktivitas", "target"]
    for kat in kategori_wajib:
        assert kat in REMINDER_MESSAGES
        title_prefix, desc = REMINDER_MESSAGES[kat]
        assert len(title_prefix) > 0
        assert len(desc) > 0
