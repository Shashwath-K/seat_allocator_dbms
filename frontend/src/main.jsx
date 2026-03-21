import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Batches from './pages/Batches.jsx'
import BatchDetail from './pages/BatchDetail.jsx'
import Students from './pages/Students.jsx'
import Rooms from './pages/Rooms.jsx'
import Allotment from './pages/Allotment.jsx'
import RoomAllotmentDetail from './pages/RoomAllotmentDetail.jsx'
import Database from './pages/Database.jsx'
import Mentors from './pages/Mentors.jsx'
import MentorDetail from './pages/MentorDetail.jsx'
import AIAllocator from './pages/AIAllocator.jsx'
import './index.css'

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/",
        element: <Dashboard />
      },
      {
        path: "/batches",
        element: <Batches />
      },
      {
        path: "/batches/:batchId",
        element: <BatchDetail />
      },
      {
        path: "/students",
        element: <Students />
      },
      {
        path: "/rooms",
        element: <Rooms />
      },
      {
        path: "/allotment",
        element: <Allotment />
      },
      {
        path: "/allotment/:roomId",
        element: <RoomAllotmentDetail />
      },
      {
        path: "/database",
        element: <Database />
      },
      {
        path: "/mentors",
        element: <Mentors />
      },
      {
        path: "/mentors/:mentorId",
        element: <MentorDetail />
      },
      {
        path: "/ai",
        element: <AIAllocator />
      }
    ]
  }
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
