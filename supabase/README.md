# Supabase database setup

Project reference: `ulhnkrtbswolpywesbgx`  
Region: `ap-south-1` (Mumbai)  
Database engine: PostgreSQL 17

The initial schema was applied to the new, dedicated Biz FOX ERP project as migration `20261124041909_initial_secure_office_schema`. The next migration is tracked in this repository and adds the foreign-key indexes recommended by the Supabase performance advisor.

The database currently has 13 public tables. Row Level Security is enabled on all of them. Organization records are isolated by active membership. The creator of a new organization is automatically assigned the owner role by a database trigger. Membership changes are intentionally not exposed to ordinary browser writes; secure staff invitation and role-management flows will be added through a trusted server-side workflow.

Do not put a Supabase service-role or secret key in this repository. The browser uses only the project publishable key. Generated database types live at `types/database.types.ts`.

Before deploying schema changes, apply them to the Biz FOX ERP Supabase project, verify them, run Supabase security/performance advisors, and commit the matching SQL migration here.
