# DiscoCo - Discord Clone

A real-time chat application built with Next.js App Router, Clerk authentication, Prisma ORM with PostgreSQL, Shadcn UI components, and TanStack Query.

## Features

- 🔐 Authentication with Clerk
- 💬 Real-time messaging
- 🎮 Server and channel management
- 👥 Member roles (Admin, Moderator, Guest)
- 📱 Responsive design with Discord-like UI
- 🎨 Beautiful UI with Shadcn components
- ⚡ Optimized data fetching with TanStack Query

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Shadcn UI
- **Authentication**: Clerk
- **Database**: PostgreSQL with Prisma ORM
- **State Management**: TanStack Query
- **Icons**: Lucide React

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Clerk account for authentication

## Setup Instructions

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd discoco
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:

   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/discord_clone"

   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
   CLERK_SECRET_KEY=your_clerk_secret_key_here
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
   ```

4. **Set up the database**

   ```bash
   # Generate Prisma client
   npx prisma generate

   # Run database migrations
   npx prisma db push

   # (Optional) Seed the database
   npx prisma db seed
   ```

5. **Run the development server**

   ```bash
   pnpm dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (main)/            # Main application layout
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── chat/              # Chat-related components
│   ├── navigation/        # Navigation components
│   ├── server/            # Server-related components
│   └── ui/                # Shadcn UI components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions
└── generated/             # Generated Prisma client
```

## Key Features Implementation

### Authentication

- Clerk provides seamless authentication
- User data is synced to the database automatically
- Protected routes with middleware

### Real-time Messaging

- Messages are stored in PostgreSQL
- TanStack Query provides optimistic updates
- Infinite scroll for message history

### Server Management

- Create and join servers
- Role-based permissions
- Channel organization

### UI/UX

- Discord-inspired design
- Dark/light mode support
- Responsive layout
- Smooth animations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for educational purposes. Please respect Discord's terms of service and don't use this for commercial purposes that might compete with Discord.
