---
name: auth-identities
description: Supabase user identity object — provider_id, user_id, identity_data, provider, email, created_at, last_sign_in_at. One user can have multiple identities (email + Google). Anonymous users have no identity until one is linked.
topics: [auth, identities, oauth, anonymous-users, user-object]
applies_to: [src/contexts/AuthContext.tsx, src/services/profileService.ts]
source: https://supabase.com/docs/guides/auth/auth-identity-linking
---

# Identities

An identity is an authentication method associated with a user. Supabase Auth supports the following types of identity:

- Email
- Phone
- OAuth
- SAML

A user can have more than one identity. Anonymous users have no identity until they link an identity to their user.

## The user identity object

The user identity object contains the following attributes:

| Attributes         | Type     | Description                                                                                                                                                                                                                              |
| ------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| provider\_id       | `string` | The provider id returned by the provider. If the provider is an OAuth provider, the id refers to the user's account with the OAuth provider. If the provider is `email` or `phone`, the id is the user's id from the `auth.users` table. |
| user\_id           | `string` | The user's id that the identity is linked to.                                                                                                                                                                                            |
| identity\_data     | `object` | The identity metadata. For OAuth and SAML identities, this contains information about the user from the provider.                                                                                                                        |
| id                 | `string` | The unique id of the identity.                                                                                                                                                                                                           |
| provider           | `string` | The provider name.                                                                                                                                                                                                                       |
| email              | `string` | The email is a generated column that references the optional email property in the identity\_data                                                                                                                                        |
| created\_at        | `string` | The timestamp that the identity was created.                                                                                                                                                                                             |
| last\_sign\_in\_at | `string` | The timestamp that the identity was last used to sign in.                                                                                                                                                                                |
| updated\_at        | `string` | The timestamp that the identity was last updated.                                                                                                                                                                                        |
