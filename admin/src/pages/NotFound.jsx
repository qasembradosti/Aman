import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-primary mb-4">404</h1>
          <h2 className="text-3xl font-semibold text-gray-800 mb-2">
            Page Not Found
          </h2>
          <p className="text-gray-600 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Home size={20} />
            Go to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
        </div>

        <div className="mt-12">
          <svg
            className="w-full max-w-sm mx-auto opacity-50"
            viewBox="0 0 400 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="200" cy="150" r="120" fill="#E5E7EB" />
            <path
              d="M160 130C160 119.507 168.507 111 179 111C189.493 111 198 119.507 198 130V170C198 180.493 189.493 189 179 189C168.507 189 160 180.493 160 170V130Z"
              fill="#9CA3AF"
            />
            <path
              d="M202 130C202 119.507 210.507 111 221 111C231.493 111 240 119.507 240 130V170C240 180.493 231.493 189 221 189C210.507 189 202 180.493 202 170V130Z"
              fill="#9CA3AF"
            />
            <path
              d="M160 200C160 200 180 220 200 220C220 220 240 200 240 200"
              stroke="#9CA3AF"
              strokeWidth="8"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
