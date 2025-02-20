# Intersect Workshops

A Next.js application for managing decentralized workshops and voting processes using Web3Auth and Cardano blockchain integration.

## Features

- 🔐 Secure authentication with NextAuth.js and Web3Auth
- 🗳️ Decentralized voting system with Cardano blockchain integration
- 📊 Workshop management and registration system
- 📧 Email notifications with customizable templates
- 🔒 End-to-end encryption for sensitive data
- 🌐 Built with modern web technologies

## Tech Stack

- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [NextAuth.js](https://next-auth.js.org/) - Authentication
- [Web3Auth](https://web3auth.io/) - Blockchain authentication
- [Lucid](https://lucid.spacebudz.io/) - Cardano blockchain integration
- [TailwindCSS](https://tailwindcss.com/) - Styling
- [TypeScript](https://www.typescriptlang.org/) - Type safety

## Getting Started

### Prerequisites

- Node.js 16.x or later
- PostgreSQL database
- SMTP server for email notifications
- Web3Auth account
- Blockfrost API key (for Cardano integration)

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=

# Authentication
JWT_PRIVATE_KEY=
JWT_PUBLIC_KEY=
SECRET=

# Email
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

# Blockchain
WEB3AUTH_CLIENT_ID=
BLOCKFROST_KEY=
BLOCKFROST_URL=

# Security
ENCRYPTION_KEY=
```

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/intersect-workshops.git
cd intersect-workshops
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

4. Run the development server:
```bash
npm run dev
```

## Security Considerations

- All sensitive data is encrypted at rest using AES-256-CBC
- JWT tokens are signed using RS256 algorithm
- Email verification required for all accounts
- Rate limiting on API endpoints
- Input validation and sanitization
- Session management with secure cookies
- Environment variables for all sensitive configurations

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Web3Auth](https://web3auth.io/) for blockchain authentication
- [Cardano](https://cardano.org/) blockchain community
- All contributors who have helped shape this project

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.