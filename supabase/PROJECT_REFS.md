# Supabase Project References

Fill these in after running `supabase link --project-ref <ref>`.
The ref is the alphanumeric string in the Supabase dashboard URL:
`https://supabase.com/dashboard/project/<ref>`

## Dev

```
Project ref: noybpekrlammwwiopval
```

```bash
npx supabase link --project-ref <ref>
npx supabase db push
```

## Prod

```
Project ref: mxgsiegzllsbkqrhujrk
```

```bash
npx supabase link --project-ref <ref>
npx supabase db push
```

## owner_email

Both projects use `alythcott@gmail.com` — seeded by the
`20260511000000_init_profiles_squads.sql` migration into `public.app_config`.

If the email ever changes, run this in the Supabase SQL Editor for each project:

```sql
UPDATE public.app_config SET value = 'new@email.com' WHERE key = 'owner_email';
```
