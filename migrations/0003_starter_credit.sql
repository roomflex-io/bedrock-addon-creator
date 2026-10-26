alter table wallets add column if not exists starter_granted boolean not null default false;
alter table wallets alter column coins set default 0;

-- Anyone who already spent or claimed keeps their balance and does not get a second credit.
update wallets
set starter_granted = true
where not (coins = 12 and grant_claimed = false);

-- The old untouched starter pile (12, never claimed) becomes the new first-creation credit.
update wallets
set coins = 0
where coins = 12 and grant_claimed = false and starter_granted = false;
