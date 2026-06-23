# Siroz Hastalarında Minimal Hepatik Ensefalopati (MHE) Tarama Uygulaması

Bu Progressive Web App (PWA), **siroz hastalarında Minimal Hepatik Ensefalopati'nin erken tespitine** yönelik bilişsel ve psikomotor tarama testlerini dijital ortamda uygulamak amacıyla tıp tezi kapsamında geliştirilmiştir. Hastalar uygulamayı tarayıcı üzerinden açıp telefonlarına yükleyebilir; testleri tamamladıklarında sonuçlar güvenli şekilde bulutta saklanır ve araştırmacı tarafından incelenebilir.

> Bu README, projeyi devralacak ve uygulamayı kullanacak hekim/araştırmacı için hazırlanmıştır. Yazılım bilgisi gerektirmeyen adımlar Türkçe ve sade biçimde anlatılmıştır.

---

## İçindekiler

1. [Projenin Amacı](#projenin-amacı)
2. [Kullanılan Teknolojiler](#kullanılan-teknolojiler)
3. [Uygulamadaki Testler](#uygulamadaki-testler)
4. [Hasta Akışı](#hasta-akışı)
5. [Kurulum (İlk Defa Çalıştıracaklar İçin)](#kurulum-ilk-defa-çalıştıracaklar-için)
6. [Supabase (Veritabanı) Kurulumu](#supabase-veritabanı-kurulumu)
7. [Ortam Değişkenleri (.env)](#ortam-değişkenleri-env)
8. [Uygulamayı Çalıştırma](#uygulamayı-çalıştırma)
9. [Yayına Alma (Deploy)](#yayına-alma-deploy)
10. [Proje Dosya Yapısı](#proje-dosya-yapısı)
11. [Veri Tabanı Şeması](#veri-tabanı-şeması)
12. [Verilerin Tez Analizi İçin Dışa Aktarımı](#verilerin-tez-analizi-için-dışa-aktarımı)
13. [Etik & KVKK Notları](#etik--kvkk-notları)
14. [Sık Karşılaşılan Sorunlar](#sık-karşılaşılan-sorunlar)
15. [İletişim & Katkı](#iletişim--katkı)

---

## Projenin Amacı

Minimal Hepatik Ensefalopati (MHE), siroz hastalarında klinik olarak belirgin olmayan ancak **dikkat, reaksiyon süresi, görsel-motor koordinasyon ve hafıza** gibi bilişsel fonksiyonlarda bozulmalara yol açan bir tablodur. Klasik psikometrik testler (PHES, kağıt-kalem testleri) zaman alıcı ve standardizasyonu zordur.

Bu uygulama:

- Hasta başında **5–10 dakikada** uygulanabilen dijital tarama testleri sunar,
- Reaksiyon süresi, doğruluk oranı ve skorları **milisaniye hassasiyetinde** kaydeder,
- Verileri merkezi bir veritabanında (**Supabase**) toplayarak istatistiksel analize hazır hâle getirir,
- **Çevrimdışı (offline)** kullanım desteği ile internetin kesintili olduğu klinik ortamlarda da çalışır (PWA).

---

## Kullanılan Teknolojiler

| Katman | Teknoloji | Açıklama |
|---|---|---|
| Editör | **Cursor** | Geliştirme/IDE ortamı (AI destekli VS Code tabanlı editör) |
| Arayüz (Frontend) | **React 19 + TypeScript** | Modern, bileşen tabanlı kullanıcı arayüzü | 
| PWA | **vite-plugin-pwa + Workbox** | Telefona yüklenebilir, çevrimdışı çalışan uygulama |  
| Veritabanı & Auth | **Supabase** (PostgreSQL) | Kullanıcı kimliği, RLS ile güvenli veri saklama |

---

## Uygulamadaki Testler

Uygulamada şu an aktif 4 modül vardır (kaynak: `src/pages/tests/`):

1. **Dot Catch Test (Nokta Yakalama)** — `DotCatchTest.tsx`
   Ekranda rastgele beliren noktaya en kısa sürede dokunma testi. **Reaksiyon zamanı** ve isabet oranını ölçer (psikomotor hız).

2. **Color Match Test (Renk Eşleştirme)** — `ColorMatchTest.tsx`
   Stroop benzeri renk-kelime eşleştirme. **Dikkat ve inhibisyon** kontrolünü değerlendirir.

3. **Word Memory Test (Kelime Hafızası)** — `WordMemoryTest.tsx`
   Gösterilen kelimelerin kısa süreli geri çağrımı. **Çalışma belleği** ölçümü.

4. **HE Questionnaire (Hepatik Ensefalopati Anketi)** — `HEQuestionnaireTest.tsx`
   Hastanın günlük hayattaki bilişsel/motor yakınmalarını derecelendirdiği yapılandırılmış anket.

Her test sonunda; `correct_count`, `wrong_count`, `total_rounds`, `average_reaction_time` veritabanına yazılır. Ham ayrıntılar `details` JSON alanında saklanır (her tıklama, her yanıt zamanı vb.).

---

## Hasta Akışı

1. Hasta uygulamayı açar → **Aydınlatılmış Onam (Consent) Ekranı**'nı okur ve kabul eder.
2. **Kayıt** olur (e-posta + ad, yaş, cinsiyet, telefon).
3. **Ana Sayfa**'dan "Yeni Test Oturumu Başlat"a basar.
4. 4 test sırasıyla uygulanır (her testin başında kısa talimat ekranı vardır).
5. Test bittiğinde **Sonuç Sayfası**'nda kendi skorlarını görür.
6. Araştırmacı, **Admin paneli** veya doğrudan Supabase üzerinden tüm hastaların verisini inceler.

---

## Kurulum (İlk Defa Çalıştıracaklar İçin)

> Bu adımları kişisel bilgisayarınızda **bir kere** yapmanız yeterlidir.

### 1. Gerekli Programlar

- **Node.js (sürüm 20 veya üzeri)** → [https://nodejs.org](https://nodejs.org) adresinden "LTS" sürümünü indirip kurun.
- **Git** → [https://git-scm.com](https://git-scm.com)
- **Cursor Editör** → [https://cursor.com](https://cursor.com) (proje bu editör için optimize edilmiştir)

### 2. Projeyi İndirin

Terminal (Mac'te "Terminal", Windows'ta "PowerShell") açıp şunu yazın:

```bash
git clone <proje-git-adresi>
cd cirrhosis-pwa
```

### 3. Bağımlılıkları Yükleyin

```bash
npm install
```

Bu komut birkaç dakika sürer ve `node_modules` klasörünü oluşturur.

---

## Supabase (Veritabanı) Kurulumu

1. [https://supabase.com](https://supabase.com) adresine girip **ücretsiz** hesap oluşturun.
2. "New Project" deyip projeye bir isim verin (ör. `cirrhosis-tez`). Bir veritabanı şifresi belirleyin ve **bir yere not edin**.
3. Proje oluştuktan sonra sol menüden **SQL Editor** sekmesine geçin.
4. Bu projedeki `supabase-schema.sql` dosyasının **tüm içeriğini** kopyalayın, SQL Editor'e yapıştırın ve **Run** deyin. Bu komut; `profiles`, `tests`, `test_results` tablolarını, indeksleri ve **Row Level Security (RLS)** kurallarını oluşturur.
5. Sol menüden **Project Settings → API** bölümüne gelin. Buradan iki değeri kopyalayın:
   - **Project URL** (örn. `https://xxxxx.supabase.co`)
   - **anon public key** (uzun bir metin)

---

## Ortam Değişkenleri (.env)

Proje kök klasörüne `.env.local` adında bir dosya oluşturup içine şunu yazın:

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_KEY=buraya_anon_public_key_yapıştırın
```

> `.env.local` dosyası `.gitignore` içinde yer aldığı için **Git'e gönderilmez** ve gizli kalır.

`src/lib/` altındaki Supabase istemcisi bu değişkenleri otomatik okur.

---

## Uygulamayı Çalıştırma

### Geliştirme Modu (kendi bilgisayarınızda test için)

```bash
npm run dev
```

Terminalde çıkan adresi (genelde `http://localhost:5173`) tarayıcıda açın.

### Üretim Derlemesi

```bash
npm run build
npm run preview
```

`dist/` klasörü oluşur; bu klasör herhangi bir statik hosting servisine yüklenebilir.

---

## Yayına Alma (Deploy)

Hastaların telefonlarından erişebilmesi için uygulamanın internette yayında olması gerekir. En kolay yöntemler:

- **Vercel** → [vercel.com](https://vercel.com) hesabı açın, GitHub reposunu bağlayın, "Deploy" deyin. `.env` değişkenlerini Vercel'in "Environment Variables" sekmesine ekleyin.
- **Netlify** → Benzer şekilde sürükle-bırak veya Git bağlantısı ile.

Yayına alındıktan sonra hastaya verilecek link örneği: `https://cirrhosis-tez.vercel.app`

PWA olduğu için hasta tarayıcıda "Ana Ekrana Ekle" deyince uygulama bir mobil uygulama gibi davranır.

---

## Proje Dosya Yapısı

```
cirrhosis-pwa/
├── public/                      # Statik dosyalar (ikon, manifest)
├── src/
│   ├── components/              # Tekrar kullanılabilir arayüz bileşenleri
│   ├── context/                 # React Context (auth, oturum)
│   ├── hooks/                   # Özel React hook'ları
│   ├── lib/                     # Supabase istemcisi, yardımcı fonksiyonlar
│   ├── pages/
│   │   ├── ConsentScreen.tsx    # Onam ekranı
│   │   ├── RegisterScreen.tsx   # Hasta kayıt
│   │   ├── Home.tsx             # Ana sayfa
│   │   ├── Profile.tsx          # Hasta profili
│   │   ├── TestSession.tsx      # Test oturumu yöneticisi
│   │   ├── TestDetail.tsx       # Tek test ayrıntı görünümü
│   │   ├── Results.tsx          # Sonuç ekranı
│   │   ├── admin/               # Araştırmacı paneli
│   │   └── tests/               # 4 test modülü (.tsx)
│   ├── types/                   # TypeScript tip tanımları
│   ├── App.tsx                  # Uygulama kökü ve yönlendirme
│   └── main.tsx                 # Giriş noktası
├── supabase-schema.sql          # Veritabanı şeması (SQL)
├── .env.example                 # Örnek ortam değişkenleri
├── vite.config.ts               # Vite + PWA yapılandırması
└── package.json                 # Bağımlılıklar & komutlar
```

---

## Veri Tabanı Şeması

Üç ana tablo vardır (ayrıntı için `supabase-schema.sql`):

### `profiles`
Hastanın demografik bilgileri ve onam durumu.
`id, display_name, phone, age, gender, is_active, consent_accepted, consent_accepted_at, created_at, updated_at`

### `tests`
Bir hastanın **bir oturumda** yaptığı testlerin başlığıdır.
`id, user_id, started_at, completed_at, status, total_score, notes`

### `test_results`
Her bir testin (4 testten biri) ayrıntılı sonucu.
`id, test_id, user_id, test_type, timestamp, correct_count, wrong_count, total_rounds, average_reaction_time, score, details (JSONB)`

`test_type` alanı şu değerlerden biridir: `dot-catch`, `color-match`, `word-memory`, `he-questionnaire`.

**Row Level Security (RLS)** etkindir: Her hasta yalnızca **kendi** verisini görebilir; araştırmacı ise admin rolüyle tüm veriye erişir.

---

## Verilerin Tez Analizi İçin Dışa Aktarımı

Veriyi **SPSS / R / Excel** ile analiz etmek için:

1. Supabase panelinde sol menüden **Table Editor**'e girin.
2. `test_results` tablosunu açın → sağ üstte **Export → CSV** seçeneğini kullanın.
3. Aynı işlemi `tests` ve `profiles` tabloları için tekrarlayın.
4. CSV dosyalarını `user_id` üzerinden Excel/SPSS'te birleştirin (VLOOKUP veya MERGE).

Alternatif olarak Supabase **SQL Editor**'de şu örnek sorgu ile birleşik bir tablo elde edebilirsiniz:

```sql
SELECT
  p.id AS hasta_id,
  p.age, p.gender,
  t.started_at, t.completed_at, t.total_score,
  tr.test_type, tr.score, tr.correct_count, tr.wrong_count,
  tr.average_reaction_time
FROM profiles p
JOIN tests t ON t.user_id = p.id
JOIN test_results tr ON tr.test_id = t.id
WHERE t.status = 'completed'
ORDER BY p.id, t.started_at, tr.test_type;
```

Çıkan sonuçları "Download CSV" ile indirebilirsiniz.

---

## Etik & KVKK Notları

- Uygulamada **aydınlatılmış onam** ekranı zorunludur; kabul etmeden test başlatılamaz (`profiles.consent_accepted`).
- Hasta bilgileri Supabase üzerinde **şifreli** saklanır (TLS in transit, AES at rest).
- Tez çalışmasını sunarken **Etik Kurul onayı** ve KVKK uyumlu **Açık Rıza Formu** ekleyiniz.
- Yayın sırasında hasta verileri **anonimleştirilmiş** (yaş aralığı, cinsiyet, hasta no) biçimde sunulmalıdır.

---

## Sık Karşılaşılan Sorunlar

| Sorun | Çözüm |
|---|---|
| `npm install` hata veriyor | Node.js sürümünü kontrol edin (`node -v` ≥ 20). |
| Giriş yaparken "Invalid API key" | `.env.local` içindeki `VITE_SUPABASE_KEY` doğru kopyalanmamış olabilir. |
| Testler boş açılıyor | Tarayıcıyı sert yenileyin (Ctrl+Shift+R / Cmd+Shift+R) — eski PWA önbelleği temizlenir. |
| Supabase'de tablolar boş | RLS politikaları nedeniyle yalnızca giriş yapan kullanıcının verisi görünür; admin sorguları için **Service Role Key** ile bağlanın. |
| Offline yapılan testler senkronlanmadı | Hasta tekrar internete bağlanıp uygulamayı açınca `synced=false` kayıtlar otomatik gönderilir. |

---

## İletişim & Katkı

- **Tez Sahibi:** _(buraya hekimin adı ve iletişimi eklenmelidir)_
- **Danışman Öğretim Üyesi:** _(buraya eklenmelidir)_
- **Geliştirici / Teknik Sorumlu:** _(buraya eklenmelidir)_

Hata bildirimi veya öneri için projenin Git deposunda **Issue** açabilirsiniz.

---

> Bu uygulama akademik araştırma amacıyla geliştirilmiştir; **tıbbi tanı amacıyla tek başına kullanılamaz**. Klinik karar her zaman hekim değerlendirmesi ile birlikte verilmelidir.
