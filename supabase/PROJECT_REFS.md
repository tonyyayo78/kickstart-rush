# Supabase Project References

Fill these in after running `supabase link --project-ref <ref>`.
The ref is the alphanumeric string in the Supabase dashboard URL:
`https://supabase.com/dashboard/project/<ref>`

## Dev

```
Project ref: <fill in>
```

```bash
npx supabase link --project-ref <ref>
npx supabase db push
```

## Prod

```
Project ref: <fill in>
```

```bash
npx supabase link --project-ref <ref>
npx supabase db push
```

## app.owner_email

Both projects use `alythcott@gmail.com` — already hardcoded in the
`20260511000000_init_profiles_squads.sql` migration. No override needed.

If the email ever changes, run this in the Supabase SQL Editor for each project:

```sql
ALTER DATABASE postgres SET app.owner_email = 'new@email.com';
```
