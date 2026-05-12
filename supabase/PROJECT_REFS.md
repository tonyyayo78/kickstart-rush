# Supabase Project References

This is the only Supabase project. See docs/12-deployment-and-operations.md for context.

## Prod

```
Project ref: mxgsiegzllsbkqrhujrk
```

```bash
npx supabase link --project-ref mxgsiegzllsbkqrhujrk
npx supabase db push
```

## owner_email

The project uses `alythcott@gmail.com` — seeded by the
`20260511000000_init_profiles_squads.sql` migration into `public.app_config`.

If the email ever changes, run this in the Supabase SQL Editor:

```sql
UPDATE public.app_config SET value = 'new@email.com' WHERE key = 'owner_email';
```
