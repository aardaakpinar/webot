# Webot

Bir `wecordy.js` tabanlı moderation bot örneğidir. Bot, sunucuda saklanan SSS (FAQ) yanıtlarını hem slash komutu hem de normal sohbet mesajları üzerinden sorulara yanıtlayabilecek şekilde tasarlandı.

## Özellikler

- `?` veya Türkçe soru kelimeleri ile başlayan mesajlarda otomatik arama yapar.
- En iyi eşleşmeyi bulup cevabı gönderir.
- Eşleşme yüzdesini konsola yazdırır.
- Sunucu başına ayrı veri dosyası (`server-data/<serverId>.json`) ile FAQ kaydeder.
- Aşağıdaki slash komutları destekler:
  - `/ask` — soru sorup en iyi SSS yanıtını alır.
  - `/add-faq` — yeni SSS cevabı ekler.
  - `/remove-faq` — SSS cevabını siler.
  - `/list-faqs` — kayıtlı tüm SSS kayıtlarını listeler.
  - `/add-admin` — SSS yönetici atar.
  - `/remove-admin` — SSS yönetici kaldırır.
  - `/list-admins` — SSS yöneticilerini listeler.

## Gereksinimler

- Node.js
- `npm`
- Wecordy bot token

## Kurulum

1. Depoları yükleyin:

```bash
npm install
```

2. Kök dizine bir `.env` dosyası ekleyin ve `BOT_TOKEN` değerini ayarlayın:

```env
BOT_TOKEN=your_bot_token_here
```

## Çalıştırma

Projeyi derleyin:

```bash
npm run build
```

Botu çalıştırın:

```bash
npm start
```

Geliştirme sırasında otomatik derleme yapmak için:

```bash
npm run watch
```

## Kullanım

- Bot soruları otomatik algılar:
  - `Banka limiti nasıl artar?`
  - `Ne yapmalıyım?`
  - `Neden bu hata alıyorum?`

- Eğer eşleşme bulunursa bot cevabı atar.
- Konsolda eşleşme skoru aşağıdaki gibi yazdırılır:
  - `FAQ match score: 72.3% for query: Banka limiti nasıl artar?`

## Veri Depolama

Sunucu bazlı veriler `server-data` klasörüne JSON olarak kaydedilir.

## Kaynak Dosyalar

- `src/index.ts` — botun ana giriş noktası.
- `src/handlers.ts` — mesaj ve slash komutlarını işler.
- `src/faq.ts` — metin normalizasyonu ve eşleşme algoritması.
- `src/dataStore.ts` — sunucu verilerini dosyaya kaydeder.
- `src/commands.ts` — slash komut tanımları.
- `src/types.ts` — tip tanımları.

## Notlar

Bot şu anda basit bir SSS sistemi olarak çalışır. `wecordy.js` için resmi dokümantasyon / wiki hazır olduğunda daha fazla özellik eklenebilir.
