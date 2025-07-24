# Event Analytics Frontend

A modern React frontend for visualizing event analytics, funnels, and retention data.

## Features

- 📊 **Dashboard**: Overview of key metrics and event distribution
- 🎯 **Funnels**: Create and analyze conversion funnels with step-by-step visualization
- 📈 **Retention**: Cohort analysis with retention charts and metrics
- 📋 **Events**: Monitor event metrics and send test events
- 👥 **Users**: Individual user journey analysis and behavior patterns

## Tech Stack

- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **React Router** for navigation
- **Axios** for API communication
- **Lucide React** for icons
- **React Hot Toast** for notifications

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Backend API running on `http://localhost:3000`

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will be available at `http://localhost:3001`

### Environment Variables

Create a `.env` file in the frontend directory:

```env
REACT_APP_API_URL=http://localhost:3000/api/v1
REACT_APP_API_KEY=sample-api-key-789
```

## Usage

### Dashboard
- View overall metrics and event distribution
- See page views over time
- Monitor total events and unique users

### Funnels
- Create custom conversion funnels
- Analyze step-by-step conversion rates
- Identify drop-off points in user journeys

### Retention
- Track user retention over time
- Analyze cohort behavior
- View retention charts and metrics

### Events
- Monitor event metrics by type
- Send test events
- View event distribution over time

### Users
- Analyze individual user journeys
- View user behavior patterns
- Track event sequences for specific users

## API Integration

The frontend communicates with the backend API using the following endpoints:

- `GET /api/v1/health` - Health check
- `GET /api/v1/events/summary` - Events summary
- `POST /api/v1/events` - Send events
- `GET /api/v1/funnels` - Get funnels
- `POST /api/v1/funnels` - Create funnel
- `GET /api/v1/funnels/:id/analytics` - Funnel analytics
- `GET /api/v1/retention` - Retention data
- `GET /api/v1/metrics` - Event metrics
- `GET /api/v1/users/:id/journey` - User journey
- `GET /api/v1/users/:id/summary` - User summary

## Development

### Project Structure

```
src/
├── components/          # Reusable components
│   └── Layout.tsx      # Main layout with navigation
├── pages/              # Page components
│   ├── Dashboard.tsx   # Dashboard page
│   ├── Funnels.tsx     # Funnels page
│   ├── Retention.tsx   # Retention page
│   ├── Events.tsx      # Events page
│   └── Users.tsx       # Users page
├── services/           # API services
│   └── api.ts         # API client and types
├── App.tsx            # Main app component
└── index.tsx          # Entry point
```

### Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App

## Deployment

1. Build the production version:
```bash
npm run build
```

2. The built files will be in the `build/` directory

3. Deploy the contents of the `build/` directory to your web server

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License. 