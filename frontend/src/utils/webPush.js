import { reminderApi } from '../services/api';

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Browser ini tidak mendukung Service Worker.');
  }
  const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  return reg;
}

export async function subscribeToWebPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Browser tidak mendukung Web Push Notification.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Izin notifikasi belum diberikan atau ditolak.');
  }

  const reg = await registerServiceWorker();
  const { public_key } = await reminderApi.getVapidPublicKey();
  if (!public_key) {
    throw new Error('VAPID Public Key belum dikonfigurasi di server.');
  }

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(public_key),
  });

  const subJson = sub.toJSON();
  const payload = {
    endpoint: subJson.endpoint,
    keys: {
      p256dh: subJson.keys?.p256dh || '',
      auth: subJson.keys?.auth || '',
    },
  };

  await reminderApi.subscribePush(payload);
  return sub;
}

export async function getExistingPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return null;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

