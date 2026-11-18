-- =========================================================
-- SisaGuna — UPDATE 2: admin verifikasi, OCR dokumen,
-- Jejak Limbah data asli, dan lokasi driver.
-- Cara pakai: Supabase → SQL Editor → New query → tempel
-- seluruh isi file ini → Run. Aman dijalankan ulang.
-- (Jalankan SETELAH schema.sql dan update-1-peta-jemput.sql)
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
