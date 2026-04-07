<!-- Improved compatibility of back to top link: See: https://github.com/othneildrew/Best-README-Template/pull/73 -->
<a id="readme-top"></a>

<div align="center">

<h1>AI Seat Allocator & Management System</h1>
<p><strong>Semantic-Aware Room Allotment Engine powered by Local LLMs</strong></p>

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Django](https://img.shields.io/badge/Django-5.0%2B-092E20?style=for-the-badge&logo=django&logoColor=white)](https://djangoproject.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![Ollama](https://img.shields.io/badge/Ollama-Local%20LLM-000000?style=for-the-badge&logo=ollama&logoColor=white)](https://ollama.com)

</div>

---

## ![Objectives](https://img.shields.io/badge/-Project%20Objectives-blue?style=flat-square&logo=target)

This system was engineered to transform traditional institutional resource management into a semantic-aware automation platform:

### Objective 1 — Semantic-Aware Resource Discovery
Implement a Natural Language interface that allows administrators to query real-time database state using conversational English. By leveraging **NL-to-SQL** technology, the system answers questions like *"Which labs are available tomorrow morning?"* or *"How many seats are left in Room 101?"* without requiring technical SQL knowledge.

### Objective 2 — Intelligent Allocation Proposals
Bridge the gap between automation and human oversight through an **AI Proposal Engine**. Instead of immediate database mutations, the system generates human-readable allocation proposals (with strategy-based seating like **Shuffle**, **Sequential**, or **Chaos**) that require explicit confirmation before execution.

### Objective 3 — Specialized Room & Conflict Management
Provide diverse architectural support for different physical environments:
- **Labs** — Hardware-constrained layouts with student-to-system mapping.
- **Conference Rooms** — Variable row configurations for executive seating.
- **Regular Rooms** — Standard matrix-based seating.
All modes feature real-time conflict detection across Rooms, Mentors, and Batches.

---

## ![Architecture](https://img.shields.io/badge/-Architecture%20Overview-blue?style=flat-square&logo=gitkraken)

```
AI Seat Allocation & Management System
│
├── AI Engine (allocation/ai_views.py) ← NL Processing & Proposal Logic
│   ├── ollama_client.py               ← Local LLM interface (Ollama)
│   ├── ai_data.py                     ← Context building for model awareness
│   └── NL-to-SQL Prompt               ← Semantic mapping to SQLite
│
├── Core Backend (allocation/services.py) ← Transactional Business Logic
│   ├── batch_manager.py               ← CRUD for student groups
│   ├── room_manager.py                ← Capacity and layout calculations
│   └── allocation_engine.py           ← Seat assignment strategies
│
└── Web Application (frontend/)        ← React + Vite Modern UI
    ├── API Client (Axios)             ← Communication with Django REST
    └── Responsive Dashboard           ← Interactive allocation workspace
```

### Data Flow (NL-to-SQL Process)

```
Natural Language Input (User)
    │
    ▼
[ollama_client.py] ──Prompt Engineering──▶ Local LLM (Llama3.2)
    │
    ▼
[ai_views.py] ──Parse SQL──▶ Proposed SQLite Query
    │
    ▼
[Database Execution] ──JSON Results──▶ Contextual Answer
    │
    ▼
Conversational Response (User)
```

---

## ![Tech Stack](https://img.shields.io/badge/-Technology%20Stack-blue?style=flat-square&logo=codeforces)

### Backend / AI Engine

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Django 5.0+ | Core REST API and ORM logic |
| AI Inference | Ollama | Local LLM hosting (Llama3.2/SmolLM2) |
| Database | SQLite | Relational storage for batches/allocations |
| Business Logic | Python Services | Atomic transactions and strategy logic |
| Environment | Virtualenv | Dependency isolation |

### Frontend (Dashboard)

| Layer | Technology | Purpose |
|---|---|---|
| Library | React 19 + Vite | State-of-the-art SPA performance |
| Icons | Lucide React | Modern, consistent iconography |
| Styling | Standard CSS | High-performance, low-abstraction UI |
| HTTP Client | Axios | Seamless async backend communication |

---

## ![Structure](https://img.shields.io/badge/-Project%20Structure-blue?style=flat-square&logo=files)

```
Allocation_DB_Summarizer/
│
├── 📂 allocation/              # Core Django Application
│   ├── ai_views.py              # NL-to-SQL + Proposal handlers
│   ├── ollama_client.py         # Ollama API communication wrapper
│   ├── services.py              # Core business logic (Allocate, Reallocate)
│   ├── models.py                # System Schema (Batch, Student, Room, etc.)
│   └── signals.py               # Auto-generation of room seats
│
├── 📂 frontend/                # React + Vite Application
│   ├── 📂 src/
│   │   ├── 📂 pages/            # AI Allocator, Batches, Rooms, Logs
│   │   ├── 📂 components/       # Layouts, Sidebar, Modals
│   │   └── App.jsx              # Routing and Main Entry
│   └── package.json
│
├── 📂 documentation/           # Project Reports & Diagrams
├── 📂 seat_allocation/          # Django Project Configuration
├── System-Architecture.png      # High-level architecture diagram
├── manage.py                    # Django management script
└── README.md                    # This professional documentation
```

---

## ![Quick Start](https://img.shields.io/badge/-Quick%20Start-green?style=flat-square&logo=rocket)

### Prerequisites

```bash
# Python 3.10+ required
python --version

# Node.js 18+ required
node --version

# Ollama installed and running
ollama --version
```

### 1. Initialize Intelligence Engine

```bash
# Pull and start the recommended model
ollama run smollm2:135m  # or llama3.2
```

### 2. Backend Installation

```bash
# Clone the repository
git clone https://github.com/Shashwath-K/seat_allocator_dbms.git

# Install dependencies (from root)
pip install django django-cors-headers requests

# Apply migrations and start server
python manage.py migrate
python manage.py runserver
```

### 3. Frontend Installation

```bash
cd frontend
npm install
npm run dev
# Dashboard available at http://localhost:5173
```

---

## ![Internal Logic](https://img.shields.io/badge/-Internal%20Logic-blue?style=flat-square&logo=testify)

### The Human-in-the-Loop Workflow

1.  **Request**: User types *"Allocate Batch CS-A-24 to Room 101 for tomorrow's exam."*
2.  **Intelligence**: `ai_views.py` passes this to Ollama, which identifies a `WRITE` intent and builds a **Proposal JSON**.
3.  **Validation**: The system checks for existing conflicts (Room busy, Mentor booked, etc.) before showing the proposal.
4.  **Confirmation**: The user reviews the proposal details (Student count, Strategy, Slot).
5.  **Atomic Execution**: Upon clicking "Confirm", `services.py` executes a transaction that creates the `Session` and `Allocation` rows simultaneously.

### Allocation Strategies

| Strategy | Description | Best For |
|---|---|---|
| **Sequential** | Students assigned seats 1, 2, 3... in order. | Standard classes |
| **Shuffle** | Randomized seating distribution within the room. | High-security exams |
| **Chaos** | Interleaved seating (Student 1, Student n, Student 2, Student n-1). | Reducing collaboration |
| **Uneven** | Leaves every alternate seat empty. | Social distancing / Lab exams |

---

## ![Output](https://img.shields.io/badge/-Output%20Examples-blue?style=flat-square&logo=chart-dot)

### AI Proposal Example
```json
{
  "action": "allocate_batch",
  "summary": "Allocate CS-A-24 to Lab 102 on 2026-04-12 FN",
  "parameters": {
    "batch_id": 4,
    "room_id": 12,
    "strategy": "shuffle",
    "date": "2026-04-12",
    "time_slot": "FN"
  }
}
```

### Audit Logs
The system tracks every mutation in `SystemLog`, including:
- Time of transaction
- User who performed the action
- Specific changes (e.g., *"Reallocated 30 students in Room 101 using Chaos strategy"*)

---

## ![License](https://img.shields.io/badge/-License-blue?style=flat-square&logo=read-the-docs)

Distributed under the Unlicense License. See `LICENSE` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
