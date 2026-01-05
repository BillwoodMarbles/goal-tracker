# Root - Goal Tracker

A modern goal tracking application built with Next.js and Supabase.

## Features

### Goals Management

- **Daily Goals**: Track goals on specific days of the week
- **Weekly Goals**: Track goals across an entire week
- **Multi-Step Goals**: Break down goals into multiple steps
- **Goal Snoozing**: Temporarily skip goals for a day
- **Progress Tracking**: Visual progress indicators and completion stats
- **Date Navigation**: View and manage goals for any date

### Authentication

- Secure user authentication via Supabase Auth
- Email/password sign-up and sign-in
- Automatic data migration from localStorage

### Data Persistence

- Cloud-based storage with Supabase (Postgres)
- Row-level security ensures data privacy
- Automatic sync across devices
- Real-time data access

## Tech Stack

- **Framework**: Next.js 15 (React 19)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **UI**: Material-UI (MUI)
- **Styling**: Tailwind CSS
- **Date Handling**: Day.js
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A Supabase account (free tier works great)

### Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd root
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Supabase**

   - Follow the detailed guide in `SUPABASE_SETUP.md`
   - Create a Supabase project
   - Run the database migrations
   - Configure environment variables

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
root/
├── src/
│   └── app/
│       ├── (root)/              # Goals feature
│       │   └── goals/
│       │       ├── components/  # UI components
│       │       ├── hooks/       # React hooks
│       │       ├── services/    # Data services
│       │       └── types.ts     # TypeScript types
│       ├── components/          # Shared components
│       ├── contexts/            # React contexts
│       └── services/            # Shared services
├── supabase/
│   └── migrations/              # Database migrations
├── public/                      # Static assets
└── [config files]
```

## Key Documentation

- **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** - Complete setup guide
- **[MIGRATION_NOTES.md](MIGRATION_NOTES.md)** - Migration details and deprecated code
- **[MOBILE_API_GUIDE.md](MOBILE_API_GUIDE.md)** - Mobile app integration guide
- **[supabase/README.md](supabase/README.md)** - Database schema documentation

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode

## Features in Detail

### Daily Goals

- Schedule goals for specific days of the week
- Track completion status per day
- Support for multi-step goals with individual step tracking
- Snooze goals when needed

### Weekly Goals

- Track goals across an entire week
- One increment per day with over-completion support
- Visual progress tracking
- Automatic week calculation (Sunday-Saturday)

### Cloud Storage

- All data stored securely in Supabase
- Accessible from any device with your account
- No local storage dependencies

### Mobile Ready

- Same backend can be used by mobile apps
- Row-level security ensures data isolation
- RESTful API via Supabase
- See `MOBILE_API_GUIDE.md` for integration details

## Environment Variables

Required environment variables (add to `.env.local`):

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

[Your License Here]

## Support

For issues or questions:

1. Check the documentation files
2. Review Supabase docs: https://supabase.com/docs
3. Open an issue on GitHub

## Roadmap

- [ ] Goal categories/tags
- [ ] Goal templates
- [ ] Habit streaks
- [ ] Data export
- [ ] Goal sharing
- [ ] Mobile apps (iOS/Android)
- [ ] Dark mode improvements
- [ ] Goal reminders/notifications
