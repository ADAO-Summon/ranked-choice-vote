import NextAuth, { AuthOptions } from "next-auth";
import Email from "next-auth/providers/email";
import { SignJWT, jwtVerify } from "jose";
import { importPKCS8, importSPKI} from "jose";
import { createPrivateKey } from "crypto";
import { NextApiHandler } from "next";
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import prisma from '@/lib/prismaClient'



const importPrivateKey = async (pem: string) => {
  if (pem.includes('BEGIN PRIVATE KEY')) {
    // PKCS#8 format
    return importPKCS8(pem, 'RS256');
  } else if (pem.includes('BEGIN RSA PRIVATE KEY')) {
    // PKCS#1 format
    // Convert to PKCS#8
    const privateKey = createPrivateKey(pem);
    const pkcs8Pem = privateKey.export({
      type: 'pkcs8',
      format: 'pem'
    });
    return importPKCS8(pkcs8Pem.toString(), 'RS256');
  }
  throw new Error('Unsupported key format');
};

export const authOptions: AuthOptions = {
  providers: [
    Email({
      server: {
        secure: (process.env.LOCAL !== 'true'),
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      },
      from: process.env.SMTP_FROM,
    }),
  ],
  pages: {
    verifyRequest: '/auth/verify-request',
    signIn: '/auth/signin',
  },
  adapter: PrismaAdapter(prisma),
  secret: process.env.SECRET,
  session: {
    strategy: "jwt"
  },
  jwt: {
    encode: async ({ token }) => {
      const privateKey = process.env.JWT_PRIVATE_KEY;
      
      if (!privateKey) {
        throw new Error("JWT_PRIVATE_KEY is not set in environment variables");
      }

      // Import the private key
      const key = await importPrivateKey(privateKey);

      const tokenWithIssuer: any = token
      tokenWithIssuer.iss = 'summon-intersect'

      const encodedToken = await new SignJWT(tokenWithIssuer)
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(key);

      return encodedToken;
    },
    decode: async ({ token }) => {
      if (!token) throw 'can not decode empty token'
      const publicKey = process.env.JWT_PUBLIC_KEY;
      
      if (!publicKey) {
        throw new Error("JWT_PUBLIC_KEY is not set in environment variables");
      }

      // Import the public key
      const key = await importSPKI(publicKey, 'RS256');

      const { payload } = await jwtVerify(token, key, {
        algorithms: ['RS256'],
      });

      return payload;
    },
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      // console.log("Sign-in callback", { user, account, profile, email });
      return true;
    },
    async jwt({ token, user, account, profile, isNewUser }) {
      if (user && account) {
        console.log("first login")
        token.id = user.id;
      }
      // console.log("JWT callback", { token, user, account, isNewUser });
      return { ...token, ...user };
    },
    async session({ session, token, user }) {
      session.user = token as any;
      // console.log("Session callback", { session, token, user });
      return session;
    },
    async redirect({ url, baseUrl }) {
      // console.log("Redirect callback", { url, baseUrl });
      // If the url is just "/", redirect to the home page
      if (url === `${baseUrl}/` || url === '/') {
        return baseUrl;
      }
      // If it's a relative url, prepend the baseUrl
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      // If it's an absolute url but on the same origin, allow it
      else if (new URL(url).origin === baseUrl) {
        return url;
      }
      // Otherwise, redirect to the home page
      return baseUrl;
    },
  },
};

//@ts-ignore
const authHandler: NextApiHandler = (req, res) => NextAuth(req, res, authOptions);


export default authHandler;
