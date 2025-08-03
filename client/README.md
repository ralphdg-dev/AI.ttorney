# AI.ttorney - Legal Assistant App

A comprehensive legal assistance application built with React Native, Expo, and Supabase.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development) or Android Studio (for Android development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AI.ttorney/client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Copy the environment files and update with your Supabase credentials:
   ```bash
   cp .env.example .env
   cp .env.example .env.development
   ```
   
   Update the files with your actual Supabase credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Run on your preferred platform**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Press `w` for Web browser
   - Scan QR code with Expo Go app on your phone

## 📱 Features

- **Authentication**: Secure user registration and login
- **Role-based Access**: Different interfaces for lawyers and legal seekers
- **AI Chatbot**: Legal assistance through intelligent chat
- **Legal Forum**: Community-driven legal discussions
- **Legal Articles**: Comprehensive legal guides and resources
- **Lawyer Verification**: Professional lawyer onboarding system
- **Consultation Requests**: Direct lawyer-client communication

## 🏗️ Project Structure

```
client/
├── app/                    # Expo Router screens
│   ├── _layout.tsx        # Root layout with auth provider
│   ├── index.tsx          # Home screen
│   ├── login.tsx          # Login screen
│   ├── onboarding.tsx     # Onboarding flow
│   └── role-selection.tsx # User role selection
├── components/            # Reusable UI components
├── constants/             # App constants and colors
├── hooks/                 # Custom React hooks
├── lib/                   # Core libraries and configurations
│   ├── supabase.ts        # Supabase client and database helpers
│   └── auth-context.tsx   # Authentication context
├── types/                 # TypeScript type definitions
│   └── database.types.ts  # Auto-generated database types
└── utils/                 # Utility functions
```

## 🗄️ Database Schema

The app uses Supabase with the following main tables:

- **users**: User accounts and profiles
- **chatbot_logs**: AI chat interactions
- **forum_posts**: Community forum posts
- **legal_articles**: Legal content and guides
- **lawyer_applications**: Lawyer verification process
- **consultation_requests**: Lawyer-client consultations
- **glossary_terms**: Legal terminology database

## 🔧 Development

### Available Scripts

- `npm start` - Start the development server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run web` - Run on web
- `npm run lint` - Run ESLint
- `npm run reset-project` - Reset project configuration

### Type Safety

The project uses TypeScript with auto-generated database types. To regenerate types after schema changes:

```bash
# Install Supabase CLI
npm install -g supabase

# Generate types
supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.types.ts
```

### Database Operations

Use the provided database helpers in `lib/supabase.ts`:

```typescript
import { db } from '@/lib/supabase';

// Get all users
const { data: users } = await db.users.getAll();

// Create a forum post
const { data: post } = await db.forum.posts.create({
  title: 'Legal Question',
  body: 'Need help with...',
  user_id: currentUser.id
});
```

## 🎨 Styling

The app uses:
- **Tailwind CSS** for styling
- **Custom color scheme** defined in `constants/Colors.ts`
- **Themed components** for light/dark mode support

## 🔐 Authentication

Authentication is handled through Supabase Auth with:
- Email/password authentication
- Session management
- Role-based access control
- Secure token storage

## 📦 Dependencies

### Core
- React Native
- Expo
- TypeScript
- Supabase

### UI/UX
- Tailwind CSS
- React Native Gesture Handler
- Expo Vector Icons

### Development
- ESLint
- Prettier
- TypeScript

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation
- Open an issue on GitHub
- Contact the development team
