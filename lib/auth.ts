import type { NextAuthOptions } from 'next-auth';
import { supabaseAdmin } from './supabase';

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,

  providers: [
    {
      id: 'fenix',
      name: 'FenixEdu (IST)',
      type: 'oauth',
      // Step 1: Redirect user here to authorize
      authorization: {
        url: 'https://fenix.tecnico.ulisboa.pt/oauth/userdialog',
        params: { scope: '' }, // FenixEdu uses no explicit scope string; access is granted per app
      },
      // Step 2: Exchange code for access token
      token: {
        url: 'https://fenix.tecnico.ulisboa.pt/oauth/access_token',
        async request(context) {
          // FenixEdu requires OAuth parameters in the URL query string, not the body
          const url = new URL('https://fenix.tecnico.ulisboa.pt/oauth/access_token');
          url.searchParams.append('client_id', process.env.FENIX_CLIENT_ID!);
          url.searchParams.append('client_secret', process.env.FENIX_CLIENT_SECRET!);
          url.searchParams.append('redirect_uri', context.provider.callbackUrl);
          url.searchParams.append('code', context.params.code!);
          url.searchParams.append('grant_type', 'authorization_code');

          const res = await fetch(url.toString(), {
            method: 'POST',
            headers: {
              'Accept': 'application/json'
            }
            // No body needed; parameters are strictly in the URL
          });

          // FIX: Parse the response properly as JSON
          const data = await res.json();

          if (!res.ok) {
             throw new Error(`Fenix OAuth Error: ${data.error_description ?? res.statusText}`);
          }

          return {
            tokens: {
              access_token: data.access_token,
              token_type: 'Bearer',
              refresh_token: data.refresh_token ?? undefined,
            },
          };
        },
      },
      // Step 3: Fetch user profile
      userinfo: {
        url: 'https://fenix.tecnico.ulisboa.pt/api/fenix/v1/person',
        async request({ tokens }) {
          const res = await fetch(
            'https://fenix.tecnico.ulisboa.pt/api/fenix/v1/person',
            {
              headers: { Authorization: `Bearer ${tokens.access_token}` },
            }
          );
          return res.json();
        },
      },
      // Step 4: Map FenixEdu profile fields → NextAuth user shape
      profile(profile) {
        // FenixEdu returns: { username, name, photo: { data, type }, ... }
        const photoUrl =
          profile.photo?.data && profile.photo?.type
            ? `data:${profile.photo.type};base64,${profile.photo.data}`
            : null;

        return {
          id: profile.username,           // e.g. "ist123456"
          name: profile.name,
          email: profile.email ?? `${profile.username}@tecnico.ulisboa.pt`,
          image: photoUrl,
          // Custom fields stored in token via callbacks below
          istId: profile.username,
        };
      },
      clientId: process.env.FENIX_CLIENT_ID,
      clientSecret: process.env.FENIX_CLIENT_SECRET,
    },
  ],

  callbacks: {
    // Persist istId + role into the JWT token
    async jwt({ token, user }) {
      if (user) {
        token.istId = (user as any).istId ?? user.id;
        
        // Upsert student record into Supabase on first login
        await supabaseAdmin.from('students').upsert(
          {
            ist_id: token.istId,
            name: user.name ?? 'Unknown',
            photo_url: user.image ?? null, // Saves the base64 string to DB
          },
          { onConflict: 'ist_id' }
        );
        
        token.role = getRole(token.istId as string);
      }

      // FIX: Strip the massive base64 image from the token 
      // so it doesn't get stuffed into the browser cookie!
      if (token.picture) {
        delete token.picture;
      }

      return token;
    },
    // Expose istId + role on the client-side session object
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).istId = token.istId;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },

  pages: {
    signIn: '/',          // Custom sign-in page
    error: '/?error=true',
  },
};

// Simple role resolver — swap this for a DB lookup if needed
function getRole(istId: string): 'teacher' | 'student' {
  const teachers = (process.env.TEACHER_IST_IDS ?? '').split(',');
  return teachers.includes(istId) ? 'teacher' : 'student';
}