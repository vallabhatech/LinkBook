# LinkBook – Lightweight Appointment & Queue Management for Local Businesses

> **Tagline:** Calendly for salons and clinics, optimized for Indian small businesses.

## 🚀 Overview

LinkBook is a **simple, efficient appointment-booking platform** that helps small service businesses like salons, dental clinics, general clinics, spas, and other local service providers manage their **appointments and walk-in queues** using just a **shareable booking link** and an optional **QR code** at the shop.

No app installs, no complex onboarding.

## 🎯 Features

### Core Features
- **Provider Onboarding**: Step-by-step setup for business details, working hours, and services
- **Smart Time-Slot Generation**: Automatic slot generation based on working hours and service duration
- **Public Booking Page**: Shareable link for customers to view services and book appointments
- **Provider Dashboard**: View and manage bookings (accept/reject/complete)
- **Walk-in Queue Management**: Token system for walk-in customers with estimated wait times
- **QR Code Generation**: Generate QR codes for booking links and queue pages

### Tech Stack
- **Frontend**: Next.js 16 with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite with Prisma ORM
- **Authentication**: JWT-based
- **Other**: date-fns, qrcode, zod

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd linkbook
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Initialize the database:
```bash
npx prisma migrate dev
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
├── prisma/              # Database schema and migrations
├── src/
│   ├── app/            # Next.js App Router pages and API routes
│   │   ├── api/        # API endpoints
│   │   ├── (auth)/     # Authentication pages (login, register)
│   │   ├── book/       # Public booking page
│   │   ├── dashboard/  # Provider dashboard
│   │   ├── onboarding/ # Provider onboarding flow
│   │   └── queue/      # Walk-in queue page
│   ├── components/     # Reusable UI components
│   ├── contexts/       # React contexts (Auth)
│   └── lib/            # Utility functions and configurations
└── public/             # Static assets
```

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/me` - Get current user

### Provider Management
- `POST /api/providers` - Create provider profile
- `GET /api/providers/:id` - Get provider details
- `PUT /api/providers/:id` - Update provider
- `POST /api/providers/:id/working-hours` - Set working hours
- `POST /api/providers/:id/services` - Add services
- `GET /api/providers/:id/bookings` - Get bookings
- `GET /api/providers/:id/analytics` - Get analytics
- `GET /api/providers/:id/qrcode` - Generate QR code

### Public Booking
- `GET /api/public/:slug` - Get provider public profile
- `GET /api/public/:slug/slots` - Get available slots
- `POST /api/public/:slug/bookings` - Create booking

### Queue Management
- `GET /api/public/:slug/queue` - Get queue status
- `POST /api/public/:slug/queue` - Get token
- `PUT /api/queue/:id` - Update token status

## 🧪 Demo Flow

### Salon Booking
1. Sign up and create a business profile (e.g., "Golden Salon")
2. Add services (Haircut, Shaving, Hair Spa)
3. Configure working hours (Mon-Sat, 10 AM - 8 PM)
4. Share booking link: `http://localhost:3000/book/golden-salon`
5. Customers can book appointments through the link
6. Manage bookings from the dashboard

### Walk-in Queue
1. Enable queue mode from dashboard
2. Print QR code for entrance
3. Customers scan QR and get token number
4. Manage queue from dashboard

## 📄 License

MIT License
