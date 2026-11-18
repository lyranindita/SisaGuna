-- =========================================================
-- SisaGuna — skema database Supabase (PostgreSQL)
-- Cara pakai: Supabase Dashboard → SQL Editor → New query →
-- tempel seluruh isi file ini → Run. Aman dijalankan ulang.
-- =========================================================

create extension if not exists pgcrypto;

-- ---------- Fungsi bantu ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- =========================================================
-- 1. PROFIL PENGGUNA (1 baris per akun, terhubung ke auth.users)
-- =========================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          text not null check (role in ('penghasil','pengolah','logistik')),
  nama          text not null,
  nib           text,
  whatsapp      text,
  email         text,
  kecamatan     text,
  alamat        text,
  -- penghasil
  jenis_usaha   text,
  -- pengolah
  jenis_olahan  text,
  kategori      text[] not null default '{}',
  kapasitas     text,
  -- logistik
  plat          text,
  armada        text,
  pendingin     boolean not null default false,
  wilayah       text[] not null default '{}',
  -- verifikasi
  dokumen_path  text,
  terverifikasi boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- peran pengguna yang sedang login (dipakai di aturan keamanan)
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- =========================================================
-- 2. LISTING LIMBAH
-- =========================================================
create table if not exists public.listings (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kategori      text not null check (kategori in ('Perikanan','Batik','Kawasan Industri','Pertanian')),
  judul         text not null,
  jenis         text,
  deskripsi     text,
  berat         text,                 -- contoh: "± 250 kg"
  harga_per_kg  integer check (harga_per_kg >= 0),
  bisa_nego     boolean not null default true,
  detail        jsonb not null default '{}',   -- isian khusus kategori (jam, wadah, jenis kain, dst.)
  frekuensi     text,
  ketersediaan  text,
  model         text not null default 'Jual Limbah'
                check (model in ('Jual Limbah','Bayar Jasa Olah','Buka Tender')),
  lokasi        text,
  kecamatan     text,
  foto          text[] not null default '{}',  -- URL publik dari bucket foto-limbah
  status        text not null default 'aktif' check (status in ('aktif','terjual','ditutup')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_listings_kategori on public.listings(kategori, created_at desc);
drop trigger if exists trg_listings_updated on public.listings;
create trigger trg_listings_updated before update on public.listings
  for each row execute function public.set_updated_at();

-- =========================================================
-- 3. PENAWARAN
-- =========================================================
create table if not exists public.offers (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid not null references public.listings(id) on delete cascade,
  buyer_id        uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  model           text not null default 'Beli Limbah' check (model in ('Beli Limbah','Bayar Jasa Olah')),
  harga_per_kg    integer not null check (harga_per_kg >= 0),
  jumlah_kg       numeric not null check (jumlah_kg > 0),
  metode_jemput   text not null check (metode_jemput in ('Mitra Logistik','Jemput Sendiri')),
  tanggal_jemput  date,
  jam_jemput      text,
  catatan         text,
  total           integer,
  status          text not null default 'menunggu'
                  check (status in ('menunggu','diterima','ditolak','dibatalkan')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_offers_listing on public.offers(listing_id);
create index if not exists idx_offers_buyer on public.offers(buyer_id);
drop trigger if exists trg_offers_updated on public.offers;
create trigger trg_offers_updated before update on public.offers
  for each row execute function public.set_updated_at();

-- =========================================================
-- 4. PESANAN, PENJEMPUTAN, ULASAN, PESAN, NOTIFIKASI
-- =========================================================
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  offer_id      uuid unique references public.offers(id) on delete set null,
  listing_id    uuid references public.listings(id) on delete set null,
  seller_id     uuid not null references public.profiles(id),
  buyer_id      uuid not null references public.profiles(id),
  logistik_id   uuid references public.profiles(id),
  status        text not null default 'menunggu_pembayaran'
                check (status in ('menunggu_pembayaran','dibayar','dijemput','dikirim','diterima','selesai','dibatalkan')),
  berat_aktual  numeric,
  total         integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
drop trigger if exists trg_orders_updated on public.orders;
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

create table if not exists public.pickups (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders(id) on delete cascade,
  logistik_id    uuid references public.profiles(id),
  langkah        smallint not null default 1 check (langkah between 1 and 4),
  suhu           text,
  foto_timbang   text,
  foto_manifest  text,
  ongkos         integer,
  updated_at     timestamptz not null default now()
);

create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  reviewer_id  uuid not null default auth.uid() references public.profiles(id),
  target_id    uuid not null references public.profiles(id),
  rating       smallint not null check (rating between 1 and 5),
  tags         text[] not null default '{}',
  komentar     text,
  created_at   timestamptz not null default now(),
  unique (order_id, reviewer_id)
);

create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null default auth.uid() references public.profiles(id),
  receiver_id  uuid not null references public.profiles(id),
  listing_id   uuid references public.listings(id) on delete set null,
  isi          text not null,
  dibaca       boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  judul       text not null,
  isi         text,
  link        text,
  dibaca      boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Notifikasi otomatis ke penjual saat ada penawaran baru
create or replace function public.notify_new_offer() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_judul text; v_buyer text;
begin
  select owner_id, judul into v_owner, v_judul from listings where id = new.listing_id;
  select nama into v_buyer from profiles where id = new.buyer_id;
  insert into notifications(user_id, judul, isi, link)
  values (v_owner, 'Penawaran baru masuk',
          coalesce(v_buyer,'Mitra') || ' menawar ' || v_judul || ' Rp' || new.harga_per_kg || '/kg',
          '#/penawaran-masuk');
  return new;
end $$;
drop trigger if exists trg_offer_notify on public.offers;
create trigger trg_offer_notify after insert on public.offers
  for each row execute function public.notify_new_offer();

-- =========================================================
-- 5. KEAMANAN (Row Level Security)
-- =========================================================
alter table public.profiles      enable row level security;
alter table public.listings      enable row level security;
alter table public.offers        enable row level security;
alter table public.orders        enable row level security;
alter table public.pickups       enable row level security;
alter table public.reviews       enable row level security;
alter table public.messages      enable row level security;
alter table public.notifications enable row level security;

-- profiles: semua pengguna login boleh melihat profil mitra; hanya pemilik yang boleh membuat/mengubah
drop policy if exists "profil terlihat" on public.profiles;
create policy "profil terlihat" on public.profiles for select to authenticated using (true);
drop policy if exists "buat profil sendiri" on public.profiles;
create policy "buat profil sendiri" on public.profiles for insert to authenticated with check (id = auth.uid() and terverifikasi = false);
drop policy if exists "ubah profil sendiri" on public.profiles;
create policy "ubah profil sendiri" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and terverifikasi = (select p.terverifikasi from public.profiles p where p.id = auth.uid()));

-- listings: listing aktif terlihat semua orang; hanya pemilik yang mengelola
drop policy if exists "listing terlihat" on public.listings;
create policy "listing terlihat" on public.listings for select using (status = 'aktif' or owner_id = auth.uid());
drop policy if exists "buat listing" on public.listings;
create policy "buat listing" on public.listings for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "ubah listing sendiri" on public.listings;
create policy "ubah listing sendiri" on public.listings for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "hapus listing sendiri" on public.listings;
create policy "hapus listing sendiri" on public.listings for delete to authenticated using (owner_id = auth.uid());

-- offers: terlihat oleh penawar & pemilik listing
drop policy if exists "penawaran terlihat" on public.offers;
create policy "penawaran terlihat" on public.offers for select to authenticated using (
  buyer_id = auth.uid() or exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid()));
drop policy if exists "kirim penawaran" on public.offers;
create policy "kirim penawaran" on public.offers for insert to authenticated with check (
  buyer_id = auth.uid() and not exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid()));
drop policy if exists "ubah status penawaran" on public.offers;
create policy "ubah status penawaran" on public.offers for update to authenticated using (
  buyer_id = auth.uid() or exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid()));

-- orders: terlihat oleh penjual, pembeli, dan logistik yang ditugaskan
drop policy if exists "pesanan terlihat" on public.orders;
create policy "pesanan terlihat" on public.orders for select to authenticated using (
  auth.uid() in (seller_id, buyer_id, logistik_id)
  or (logistik_id is null and status = 'dibayar' and public.my_role() = 'logistik'));
drop policy if exists "buat pesanan" on public.orders;
create policy "buat pesanan" on public.orders for insert to authenticated with check (seller_id = auth.uid());
drop policy if exists "ubah pesanan" on public.orders;
create policy "ubah pesanan" on public.orders for update to authenticated using (
  auth.uid() in (seller_id, buyer_id, logistik_id)
  or (logistik_id is null and status = 'dibayar' and public.my_role() = 'logistik'));

-- pickups: logistik & pihak pesanan
drop policy if exists "jemput terlihat" on public.pickups;
create policy "jemput terlihat" on public.pickups for select to authenticated using (
  logistik_id = auth.uid() or exists (select 1 from public.orders o where o.id = order_id and auth.uid() in (o.seller_id, o.buyer_id)));
drop policy if exists "logistik kelola jemput" on public.pickups;
create policy "logistik kelola jemput" on public.pickups for all to authenticated
  using (logistik_id = auth.uid()) with check (logistik_id = auth.uid());

-- reviews: publik dibaca, ditulis oleh pihak pesanan
drop policy if exists "ulasan terlihat" on public.reviews;
create policy "ulasan terlihat" on public.reviews for select using (true);
drop policy if exists "tulis ulasan" on public.reviews;
create policy "tulis ulasan" on public.reviews for insert to authenticated with check (
  reviewer_id = auth.uid() and exists (select 1 from public.orders o where o.id = order_id and auth.uid() in (o.seller_id, o.buyer_id)));

-- messages: hanya pengirim & penerima
drop policy if exists "pesan terlihat" on public.messages;
create policy "pesan terlihat" on public.messages for select to authenticated using (auth.uid() in (sender_id, receiver_id));
drop policy if exists "kirim pesan" on public.messages;
create policy "kirim pesan" on public.messages for insert to authenticated with check (sender_id = auth.uid());

-- notifications: hanya pemilik
drop policy if exists "notif sendiri" on public.notifications;
create policy "notif sendiri" on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists "baca notif" on public.notifications;
create policy "baca notif" on public.notifications for update to authenticated using (user_id = auth.uid());

-- =========================================================
-- 6. PENYIMPANAN FILE (Storage)
--    foto-limbah : publik (foto listing)
--    dokumen     : privat (NIB, izin, STNK)
--    File disimpan di folder <id-pengguna>/nama-file
-- =========================================================
insert into storage.buckets (id, name, public) values
  ('foto-limbah', 'foto-limbah', true),
  ('dokumen', 'dokumen', false)
on conflict (id) do nothing;

drop policy if exists "unggah file sendiri" on storage.objects;
create policy "unggah file sendiri" on storage.objects for insert to authenticated
  with check (bucket_id in ('foto-limbah','dokumen') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "ganti file sendiri" on storage.objects;
create policy "ganti file sendiri" on storage.objects for update to authenticated
  using (bucket_id in ('foto-limbah','dokumen') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "lihat foto limbah" on storage.objects;
create policy "lihat foto limbah" on storage.objects for select using (bucket_id = 'foto-limbah');
drop policy if exists "lihat dokumen sendiri" on storage.objects;
create policy "lihat dokumen sendiri" on storage.objects for select to authenticated
  using (bucket_id = 'dokumen' and (storage.foldername(name))[1] = auth.uid()::text);

-- =========================================================
-- 7. HAK AKSES TABEL (RLS di atas tetap membatasi baris)
-- =========================================================
grant usage on schema public to anon, authenticated;
grant select on public.listings, public.reviews to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.my_role() to authenticated;

-- =========================================================
-- 8. UPDATE 1 (peta & jemput cepat) — isi sama dengan supabase/update-1-peta-jemput.sql
-- =========================================================

-- Titik lokasi listing (dipilih di peta saat posting)
alter table public.listings add column if not exists lat double precision;
alter table public.listings add column if not exists lng double precision;

-- Permintaan Jemput Cepat
create table if not exists public.pickup_requests (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  logistik_id   uuid references public.profiles(id),
  limbah        text not null,
  berat         text,
  armada        text not null,
  waktu         text not null default 'Sekarang (< 2 jam)',
  alamat        text,
  lat           double precision not null,
  lng           double precision not null,
  tujuan        text,
  catatan       text,
  ongkos        integer,
  status        text not null default 'mencari'
                check (status in ('mencari','diambil','dijemput','selesai','dibatalkan')),
  diambil_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_pickup_status on public.pickup_requests(status, created_at);
drop trigger if exists trg_pickup_updated on public.pickup_requests;
create trigger trg_pickup_updated before update on public.pickup_requests
  for each row execute function public.set_updated_at();

alter table public.pickup_requests enable row level security;

-- terlihat oleh pemohon, logistik yang mengambil, dan semua mitra logistik selama masih "mencari"
drop policy if exists "jemput cepat terlihat" on public.pickup_requests;
create policy "jemput cepat terlihat" on public.pickup_requests for select to authenticated using (
  requester_id = auth.uid() or logistik_id = auth.uid() or (status = 'mencari' and public.my_role() = 'logistik'));
-- pemohon membuat permintaan baru
drop policy if exists "buat jemput cepat" on public.pickup_requests;
create policy "buat jemput cepat" on public.pickup_requests for insert to authenticated with check (
  requester_id = auth.uid() and status = 'mencari' and logistik_id is null);
-- pemohon hanya boleh membatalkan
drop policy if exists "pemohon batalkan" on public.pickup_requests;
create policy "pemohon batalkan" on public.pickup_requests for update to authenticated
  using (requester_id = auth.uid() and status in ('mencari','diambil'))
  with check (requester_id = auth.uid() and status = 'dibatalkan');
-- mitra logistik mengambil order yang masih "mencari"
drop policy if exists "logistik ambil" on public.pickup_requests;
create policy "logistik ambil" on public.pickup_requests for update to authenticated
  using (status = 'mencari' and logistik_id is null and public.my_role() = 'logistik')
  with check (logistik_id = auth.uid() and status = 'diambil' and requester_id <> auth.uid());
-- mitra logistik memperbarui order miliknya
drop policy if exists "logistik perbarui" on public.pickup_requests;
create policy "logistik perbarui" on public.pickup_requests for update to authenticated
  using (logistik_id = auth.uid())
  with check (logistik_id = auth.uid() and requester_id <> auth.uid() and status in ('diambil','dijemput','selesai','dibatalkan'));

-- Notifikasi otomatis ke pemohon saat status berubah
create or replace function public.notify_pickup() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_driver text;
begin
  if new.status is distinct from old.status and new.status in ('diambil','dijemput','selesai') then
    select nama into v_driver from profiles where id = new.logistik_id;
    insert into notifications(user_id, judul, isi, link) values (new.requester_id,
      case new.status when 'diambil' then 'Armada ditemukan' when 'dijemput' then 'Limbah sudah dimuat' else 'Penjemputan selesai' end,
      coalesce(v_driver, 'Mitra logistik') || ' · ' || new.limbah, '#/jemput-cepat');
  end if;
  return new;
end $$;
drop trigger if exists trg_pickup_notify on public.pickup_requests;
create trigger trg_pickup_notify after update on public.pickup_requests
  for each row execute function public.notify_pickup();

grant select, insert, update on public.pickup_requests to authenticated;

-- =========================================================
-- 9. UPDATE 2 (admin verifikasi, OCR, Jejak Limbah, lokasi driver) — isi sama dengan supabase/update-2-admin-jejak.sql
-- =========================================================
-- ---------- 1. PROFIL: status verifikasi, admin, hasil OCR ----------
alter table public.profiles add column if not exists is_admin      boolean not null default false;
alter table public.profiles add column if not exists verif_status  text not null default 'belum';
alter table public.profiles add column if not exists verif_catatan text;
alter table public.profiles add column if not exists verif_at      timestamptz;
alter table public.profiles add column if not exists ocr           jsonb;
alter table public.profiles drop constraint if exists profiles_verif_status_check;
alter table public.profiles add constraint profiles_verif_status_check
  check (verif_status in ('belum','menunggu','disetujui','ditolak'));

-- profil lama yang sudah mengunggah dokumen → masuk antrean verifikasi
update public.profiles set verif_status = 'menunggu'
  where verif_status = 'belum' and dokumen_path is not null and not terverifikasi;
update public.profiles set verif_status = 'disetujui' where terverifikasi and verif_status <> 'disetujui';

-- apakah pengguna yang login adalah admin
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;
grant execute on function public.is_admin() to authenticated;

-- penjaga profil: pengguna biasa tidak bisa menjadikan dirinya admin/terverifikasi
create or replace function public.profiles_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is null or current_user not in ('authenticated','anon') then return new; end if;  -- SQL Editor/admin server
  if tg_op = 'INSERT' then
    new.is_admin := false; new.terverifikasi := false; new.verif_at := null; new.verif_catatan := null;
    new.verif_status := case when new.dokumen_path is not null then 'menunggu' else 'belum' end;
    return new;
  end if;
  if public.is_admin() and new.id <> auth.uid() then          -- admin memverifikasi orang lain
    new.is_admin := old.is_admin;
    if new.verif_status is distinct from old.verif_status then
      new.terverifikasi := (new.verif_status = 'disetujui'); new.verif_at := now();
    end if;
    return new;
  end if;
  -- pemilik akun mengubah profilnya sendiri
  new.is_admin := old.is_admin; new.terverifikasi := old.terverifikasi; new.verif_at := old.verif_at;
  new.verif_status := old.verif_status; new.verif_catatan := old.verif_catatan;
  if new.dokumen_path is distinct from old.dokumen_path and new.dokumen_path is not null then
    new.verif_status := 'menunggu'; new.verif_catatan := null; new.terverifikasi := false;
  elsif old.verif_status = 'belum' and new.dokumen_path is not null then
    new.verif_status := 'menunggu';
  end if;
  return new;
end $$;
drop trigger if exists trg_profiles_guard on public.profiles;
create trigger trg_profiles_guard before insert or update on public.profiles
  for each row execute function public.profiles_guard();

-- kebijakan: pemilik tetap mengubah profil sendiri; admin boleh mengubah profil siapa pun
drop policy if exists "ubah profil sendiri" on public.profiles;
create policy "ubah profil sendiri" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "admin verifikasi profil" on public.profiles;
create policy "admin verifikasi profil" on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- notifikasi ke pengguna saat dokumennya disetujui / ditolak
create or replace function public.notify_verif() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.verif_status is distinct from old.verif_status and new.verif_status in ('disetujui','ditolak') then
    insert into notifications(user_id, judul, isi, link) values (new.id,
      case when new.verif_status = 'disetujui' then 'Akun terverifikasi ✓' else 'Dokumen verifikasi ditolak' end,
      coalesce(new.verif_catatan, case when new.verif_status = 'disetujui'
        then 'Dokumen usahamu sudah diperiksa admin SisaGuna.' else 'Silakan unggah ulang dokumen yang jelas.' end),
      '#/notifikasi');
  end if;
  return new;
end $$;
drop trigger if exists trg_profiles_notify on public.profiles;
create trigger trg_profiles_notify after update on public.profiles
  for each row execute function public.notify_verif();

-- admin boleh membuka dokumen verifikasi (bucket privat "dokumen")
drop policy if exists "admin lihat dokumen" on storage.objects;
create policy "admin lihat dokumen" on storage.objects for select to authenticated
  using (bucket_id = 'dokumen' and public.is_admin());

-- ---------- 2. PESANAN: data lengkap untuk Jejak Limbah ----------
alter table public.orders add column if not exists metode_jemput text not null default 'Mitra Logistik';
alter table public.orders add column if not exists judul         text;
alter table public.orders add column if not exists kategori      text;
alter table public.orders add column if not exists foto          text;
alter table public.orders add column if not exists harga_per_kg  integer;
alter table public.orders add column if not exists jumlah_kg     numeric;
alter table public.orders add column if not exists jemput_alamat text;
alter table public.orders add column if not exists jemput_lat    double precision;
alter table public.orders add column if not exists jemput_lng    double precision;
alter table public.orders add column if not exists foto_muat     text;
alter table public.orders add column if not exists foto_olah     text;
alter table public.orders add column if not exists catatan_olah  text;
alter table public.orders add column if not exists driver_lat    double precision;
alter table public.orders add column if not exists driver_lng    double precision;
alter table public.orders add column if not exists driver_at     timestamptz;

-- isi otomatis data pesanan dari penawaran & listing (tidak bisa dipalsukan dari browser)
create or replace function public.orders_fill() returns trigger
language plpgsql security definer set search_path = public as $$
declare o record; l record;
begin
  select * into o from offers where id = new.offer_id;
  if not found then raise exception 'Penawaran tidak ditemukan'; end if;
  select * into l from listings where id = o.listing_id;
  if auth.uid() is not null and l.owner_id <> auth.uid() then raise exception 'Hanya pemilik limbah yang bisa membuat pesanan'; end if;
  new.listing_id := o.listing_id; new.seller_id := l.owner_id; new.buyer_id := o.buyer_id;
  new.total := o.total; new.harga_per_kg := o.harga_per_kg; new.jumlah_kg := o.jumlah_kg;
  new.metode_jemput := o.metode_jemput; new.judul := l.judul; new.kategori := l.kategori;
  new.foto := l.foto[1]; new.jemput_alamat := coalesce(l.lokasi, l.kecamatan);
  new.jemput_lat := l.lat; new.jemput_lng := l.lng;
  new.status := 'menunggu_pembayaran'; new.logistik_id := null;
  return new;
end $$;
drop trigger if exists trg_orders_fill on public.orders;
create trigger trg_orders_fill before insert on public.orders
  for each row execute function public.orders_fill();

-- penjaga alur status pesanan: siapa boleh mengubah apa
create or replace function public.orders_guard() returns trigger
language plpgsql set search_path = public as $$
declare me uuid := auth.uid(); carrier uuid;
begin
  if me is null or current_user not in ('authenticated','anon') or public.is_admin() then return new; end if;
  if new.seller_id <> old.seller_id or new.buyer_id <> old.buyer_id or new.total is distinct from old.total
     or new.offer_id is distinct from old.offer_id or new.metode_jemput <> old.metode_jemput
     or new.harga_per_kg is distinct from old.harga_per_kg then
    raise exception 'Data pesanan tidak boleh diubah';
  end if;
  -- mitra logistik mengambil order yang sudah dibayar
  if old.logistik_id is null and new.logistik_id is not null then
    if not (new.logistik_id = me and old.status = 'dibayar' and new.status = 'dijemput'
            and old.metode_jemput = 'Mitra Logistik' and public.my_role() = 'logistik') then
      raise exception 'Order ini tidak bisa diambil';
    end if;
    return new;
  end if;
  if new.logistik_id is distinct from old.logistik_id then raise exception 'Mitra logistik tidak boleh diganti'; end if;
  carrier := case when old.metode_jemput = 'Jemput Sendiri' then old.buyer_id else old.logistik_id end;
  if new.status = old.status then
    -- tanpa ganti status: hanya pengangkut yang boleh memperbarui lokasi / berat
    if (new.driver_lat is distinct from old.driver_lat or new.driver_lng is distinct from old.driver_lng
        or new.berat_aktual is distinct from old.berat_aktual or new.foto_muat is distinct from old.foto_muat)
       and me is distinct from carrier then raise exception 'Hanya pengangkut yang bisa memperbarui lokasi'; end if;
    return new;
  end if;
  if    old.status = 'menunggu_pembayaran' and new.status = 'dibayar'    and me = old.buyer_id then null;
  elsif old.status = 'menunggu_pembayaran' and new.status = 'dibatalkan' and me in (old.buyer_id, old.seller_id) then null;
  elsif old.status = 'dibayar'  and new.status = 'dijemput' and old.metode_jemput = 'Jemput Sendiri' and me = old.buyer_id then null;
  elsif old.status = 'dibayar'  and new.status = 'dibatalkan' and me = old.buyer_id and old.logistik_id is null then null;
  elsif old.status = 'dijemput' and new.status = 'dikirim'  and me = carrier then
    if new.berat_aktual is null or new.berat_aktual <= 0 then raise exception 'Isi berat aktual hasil timbang'; end if;
  elsif old.status = 'dikirim'  and new.status = 'diterima' and me = old.buyer_id then null;
  elsif old.status = 'diterima' and new.status = 'selesai'  and me = old.buyer_id then null;
  else raise exception 'Perubahan status % → % tidak diizinkan', old.status, new.status;
  end if;
  return new;
end $$;
drop trigger if exists trg_orders_guard on public.orders;
create trigger trg_orders_guard before update on public.orders
  for each row execute function public.orders_guard();

-- data pesanan lama: lengkapi dari penawaran & listing
update public.orders r set metode_jemput = o.metode_jemput, judul = coalesce(r.judul, l.judul), kategori = coalesce(r.kategori, l.kategori),
  foto = coalesce(r.foto, l.foto[1]), harga_per_kg = coalesce(r.harga_per_kg, o.harga_per_kg), jumlah_kg = coalesce(r.jumlah_kg, o.jumlah_kg),
  jemput_alamat = coalesce(r.jemput_alamat, l.lokasi, l.kecamatan), jemput_lat = coalesce(r.jemput_lat, l.lat), jemput_lng = coalesce(r.jemput_lng, l.lng)
from public.offers o join public.listings l on l.id = o.listing_id
where o.id = r.offer_id and r.judul is null;

-- kebijakan pesanan: logistik hanya melihat order "Mitra Logistik" yang sudah dibayar
drop policy if exists "pesanan terlihat" on public.orders;
create policy "pesanan terlihat" on public.orders for select to authenticated using (
  auth.uid() in (seller_id, buyer_id, logistik_id) or public.is_admin()
  or (logistik_id is null and status = 'dibayar' and metode_jemput = 'Mitra Logistik' and public.my_role() = 'logistik'));
drop policy if exists "ubah pesanan" on public.orders;
create policy "ubah pesanan" on public.orders for update to authenticated using (
  auth.uid() in (seller_id, buyer_id, logistik_id)
  or (logistik_id is null and status = 'dibayar' and metode_jemput = 'Mitra Logistik' and public.my_role() = 'logistik'))
  with check (auth.uid() in (seller_id, buyer_id, logistik_id));

-- ---------- 3. JEJAK LIMBAH: riwayat tiap tahap pesanan ----------
create table if not exists public.order_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  tahap       text not null,
  catatan     text,
  foto_url    text,
  berat       numeric,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);
create index if not exists idx_order_events on public.order_events(order_id, created_at);
alter table public.order_events enable row level security;
drop policy if exists "jejak terlihat" on public.order_events;
create policy "jejak terlihat" on public.order_events for select to authenticated using (
  public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and auth.uid() in (o.seller_id, o.buyer_id, o.logistik_id)));
grant select on public.order_events to authenticated;

-- setiap perubahan status otomatis tercatat di Jejak Limbah + notifikasi ke pihak terkait
create or replace function public.orders_log() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_nama text; v_isi text; v_foto text; v_berat numeric; u uuid;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then return new; end if;
  select nama into v_nama from profiles where id = auth.uid();
  v_isi := case new.status
    when 'menunggu_pembayaran' then 'Penawaran diterima · menunggu pembayaran rekber'
    when 'dibayar'   then 'Dana masuk rekber SisaGuna'
    when 'dijemput'  then case when new.metode_jemput = 'Jemput Sendiri' then 'Pembeli menuju lokasi jemput' else coalesce(v_nama, 'Mitra logistik') || ' mengambil order & menuju lokasi' end
    when 'dikirim'   then 'Dimuat & ditimbang ' || coalesce(new.berat_aktual::text, '?') || ' kg · dalam perjalanan ke pengolah'
    when 'diterima'  then 'Limbah diterima pengolah'
    when 'selesai'   then coalesce('Diolah: ' || nullif(new.catatan_olah, ''), 'Bukti pengolahan diunggah')
    when 'dibatalkan' then 'Pesanan dibatalkan oleh ' || coalesce(v_nama, 'pengguna')
    else new.status end;
  v_foto := case new.status when 'dikirim' then new.foto_muat when 'selesai' then new.foto_olah else null end;
  v_berat := case when new.status = 'dikirim' then new.berat_aktual else null end;
  insert into order_events(order_id, tahap, catatan, foto_url, berat, created_by)
    values (new.id, new.status, v_isi, v_foto, v_berat, auth.uid());
  foreach u in array array[new.seller_id, new.buyer_id, new.logistik_id] loop
    if u is not null and u is distinct from auth.uid() then
      insert into notifications(user_id, judul, isi, link)
        values (u, 'Pesanan ' || coalesce(new.judul, '') || ': ' || replace(new.status, '_', ' '), v_isi, '#/pesanan');
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists trg_orders_log on public.orders;
create trigger trg_orders_log after insert or update on public.orders
  for each row execute function public.orders_log();

-- ---------- 4. JEMPUT CEPAT: lokasi driver ----------
alter table public.pickup_requests add column if not exists driver_lat double precision;
alter table public.pickup_requests add column if not exists driver_lng double precision;
alter table public.pickup_requests add column if not exists driver_at  timestamptz;

-- ---------- 5. SELESAI ----------
-- Jadikan akunmu admin (ganti email di bawah lalu jalankan baris ini saja):
-- update public.profiles set is_admin = true where email = 'emailkamu@contoh.com';
notify pgrst, 'reload schema';
