# Regular Expression to Finite Automata Converter

> An interactive, web-based educational tool that converts regular expressions into ε-NFA, DFA, and Minimized DFA using formally correct algorithms — with live graph visualization and an integrated theory reference.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Objectives](#objectives)
3. [Concepts & Topics Covered](#concepts--topics-covered)
4. [Features](#features)
5. [System Architecture](#system-architecture)
6. [How It Works](#how-it-works)
7. [Tech Stack](#tech-stack)
8. [Folder Structure](#folder-structure)
9. [Installation & Setup](#installation--setup)
10. [Usage Guide](#usage-guide)
11. [Algorithm Correctness Validation](#algorithm-correctness-validation)
12. [Live Demo](#live-demo)

---

## Project Overview

This project is a full-stack, browser-based simulator for the formal theory of computation. It accepts a regular expression as input and produces — in real time — the corresponding:

- **ε-NFA** via Thompson's Construction
- **DFA** via the Subset (Powerset) Construction algorithm
- **Minimized DFA** via Hopcroft's Partition Refinement algorithm

Each automaton is rendered as an interactive, textbook-quality directed graph. The application also includes a complete **Theory page** that explains every algorithm with inline SVG diagrams, step-by-step interactive walkthroughs, a comparison table, and a self-assessment quiz.

### The Problem Being Solved

Understanding the pipeline from regular expressions to finite automata is a foundational topic in computer science — covered in courses on Theory of Computation, Compiler Design, and Formal Languages. However, the transformation is non-trivial to visualize mentally. Existing tools are either too simplistic, visually poor, or academically inaccurate.

This project bridges that gap by providing a **mathematically rigorous, visually clean, and pedagogically structured** tool that a student or educator can use to explore and verify automata constructions interactively.

---

## Objectives

- Implement **Thompson's Construction** exactly as defined in formal automata theory, producing an ε-NFA with at most `2n` states for a regex of length `n`.
- Implement the **Subset Construction** algorithm to convert any ε-NFA to an equivalent DFA.
- Implement **Hopcroft's Algorithm** for DFA minimization using partition refinement, producing the unique minimal DFA.
- Render all three automata as **clean, non-overlapping directed graphs** with proper double-circle accept states, start arrows, and edge labels.
- Provide an **interactive theory reference** that teaches the underlying concepts with diagrams, examples, and quizzes.
- Deploy the application as a **serverless, edge-compatible** web application with zero external backend dependencies.

---

## Concepts & Topics Covered

### 1. Formal Language Theory

| Concept | Description |
|---------|-------------|
| **Regular Language** | A language recognizable by a finite automaton; described by a regular expression via Kleene's theorem |
| **Alphabet (Σ)** | Finite set of input symbols |
| **Regular Expression** | Inductive notation using union (`\|`), concatenation, Kleene star (`*`), plus (`+`), and optional (`?`) |
| **Kleene's Theorem** | States that the class of regular languages equals the class recognized by finite automata |

### 2. Thompson's Construction (Ken Thompson, 1968)

A structural induction algorithm that converts a regular expression directly into an ε-NFA. The key invariant is that every sub-expression produces a fragment with **exactly one start state and one accept state**.

| Operation | NFA Fragment Rule |
|-----------|-------------------|
| Symbol `a` | `q0 --a--> q1` (2 states, 1 transition) |
| Concatenation `AB` | Connect `A.accept --ε--> B.start` |
| Union `A\|B` | New start with ε to both; both accepts with ε to new accept |
| Kleene Star `A*` | New start/accept; ε-loop from `A.accept` back to `A.start` |
| Plus `A+` | Like star but no direct skip from new start to new accept |
| Optional `A?` | New start with ε to `A.start` and directly to new accept |

**Complexity:** O(n) states and transitions for a regex of length n.

### 3. Recursive Descent Parser

The regex is parsed using a **hand-written recursive descent parser** with correct operator precedence:

```
Precedence (low → high):
  |  (alternation)
  ·  (implicit concatenation)
  * + ?  (postfix quantifiers)
```

The parser implements four mutually recursive functions: `parseAlternation`, `parseConcatenation`, `parseStar`, and `parseAtom`. This avoids the ambiguity issues of shunting-yard approaches.

### 4. ε-Closure and Move Operations

Two fundamental NFA operations used in both simulation and subset construction:

- **ε-closure(S):** The set of all states reachable from any state in S by following zero or more ε-transitions. Computed via iterative DFS/BFS.
- **move(S, a):** The set of all states reachable from any state in S by consuming symbol `a` (without ε-moves).

### 5. Subset Construction (Powerset Construction)

Converts an ε-NFA to a DFA where each DFA state represents a **subset of NFA states**.

```
Algorithm:
  D₀ = ε-closure({q₀})
  worklist = [D₀]
  while worklist not empty:
    D = worklist.pop()
    for each symbol a ∈ Σ:
      T = ε-closure(move(D, a))
      if T not seen: add to DFA, push to worklist
      add transition D --a--> T
  D is accepting iff it contains any NFA accept state
```

**Complexity:** O(2ⁿ) worst case, O(n·|Σ|) typical case.

### 6. Hopcroft's DFA Minimization Algorithm (1971)

Finds the **unique minimal DFA** equivalent to a given DFA using partition refinement.

```
Algorithm:
  Step 0: Remove unreachable states (BFS from start)
  Step 1: P = { F, Q\F }  (accepting vs non-accepting)
  Step 2: repeat
            for each group G in P:
              for each symbol a:
                split G if states go to different partitions on a
          until no more splits
  Step 3: each partition → one minimized state (M0, M1, ...)
```

**Correctness:** Guaranteed by the Myhill-Nerode theorem — the minimal DFA is unique up to isomorphism.  
**Complexity:** O(n log n) where n is the number of DFA states.

### 7. Graph Layout Algorithm

The automaton graph uses a **manual BFS-based layered layout**:

- Nodes are assigned levels via BFS from the start state
- Within each level, nodes are sorted by in-degree
- Coordinates: `x = level × 220px`, `y = index × 140px` (centered)
- Positions are fixed — no physics simulation

**Edge routing** uses geometric collision detection: if a straight edge segment intersects any intermediate node's bounding circle, it is automatically curved (alternating CW/CCW) to avoid the obstruction.

### 8. Data Structures

All automata use **plain objects and arrays only** — no `Map` or `Set` in the serialized representation — ensuring safe JSON serialization across API boundaries:

```typescript
interface State {
  id: number;
  transitions: Record<string, number[]>;  // label → target state IDs
  isStart: boolean;
  isAccept: boolean;
}
```

---

## Features

### Simulator (`/simulator`)

| Feature | Description |
|---------|-------------|
| **Live regex conversion** | Debounced (400ms) — converts as you type |
| **NFA view** | ε-NFA with Thompson's construction, up to 2n states |
| **DFA view** | Subset construction DFA with D0, D1, ... labels |
| **Minimized DFA view** | Hopcroft-minimized DFA with M0, M1, ... labels and partition mapping |
| **Construction steps panel** | Step-by-step log of every Thompson fragment built |
| **Interactive graph** | Pan, zoom, hover highlighting on nodes and edges |
| **Edge hover** | Edges brighten to cyan on hover; connected edges highlight on node hover |
| **Double-circle accept states** | Drawn via canvas `afterDrawing` hook for textbook accuracy |
| **Parallel edge fanning** | Multiple transitions between same nodes are fanned with alternating curvature |
| **Partition mapping overlay** | In Min DFA mode, shows `M0 = {D0, D2}` etc. |
| **Example regex buttons** | One-click examples: `(a\|b)*abb`, `a*b*`, `(ab)+`, `a?b` |
| **Operator support** | `\|` `*` `+` `?` `()` and implicit concatenation |

### Theory Page (`/`)

| Feature | Description |
|---------|-------------|
| **9 accordion sections** | Regex, NFA, DFA, Thompson's, Subset Construction, Minimization, Comparison, Applications, Quiz |
| **Interactive Thompson stepper** | 4-step walkthrough with inline SVG diagrams |
| **Hover tooltips** | Technical terms show definitions on hover |
| **Comparison table** | NFA vs DFA vs Min DFA across 8 dimensions |
| **Self-assessment quiz** | 4 questions with multi-select, reveal-on-check, and explanations |
| **Applications section** | Real-world uses in search engines, compilers, bioinformatics, security |
| **Animated CTA** | Fade transition to simulator |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│                                                             │
│  ┌──────────────┐    ┌──────────────────────────────────┐  │
│  │  Theory Page │    │         Simulator Page           │  │
│  │   (/)        │    │         (/simulator)              │  │
│  │              │    │  ┌──────────┐  ┌───────────────┐ │  │
│  │  SVG Diagrams│    │  │RegexInput│  │  StepsPanel   │ │  │
│  │  Accordion   │    │  └──────────┘  └───────────────┘ │  │
│  │  Quiz        │    │       ↓                           │  │
│  │  Stepper     │    │  ┌──────────────────────────────┐ │  │
│  └──────────────┘    │  │       GraphView              │ │  │
│         │            │  │  (vis-network, manual layout) │ │  │
│         │            │  └──────────────────────────────┘ │  │
│         └────────────┤                                    │  │
│                      └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                    HTTP POST (fetch)
                              │
┌─────────────────────────────────────────────────────────────┐
│              Next.js Edge Functions (Vercel)                │
│                                                             │
│  POST /api/convert          POST /api/simulate              │
│  ┌─────────────────────┐   ┌──────────────────────────┐    │
│  │ processRegex()      │   │ simulateNFA() /           │    │
│  │ ├─ parseRegex()     │   │ simulateDFA()             │    │
│  │ │  └─ Thompson's    │   └──────────────────────────┘    │
│  │ ├─ convertToDFA()   │                                    │
│  │ └─ minimizeDFA()    │                                    │
│  └─────────────────────┘                                    │
│                                                             │
│  lib/automata.ts   lib/minimize.ts                          │
└─────────────────────────────────────────────────────────────┘
```

### Module Breakdown

| Module | Responsibility |
|--------|---------------|
| `lib/automata.ts` | Recursive descent parser, Thompson's construction, subset construction, NFA/DFA simulation |
| `lib/minimize.ts` | Hopcroft partition refinement, unreachable state removal |
| `lib/store.ts` | Zustand global state (regex, nfa, dfa, minDfa, steps) |
| `app/api/convert/route.ts` | Edge function: regex → NFA + DFA + MinDFA |
| `app/api/simulate/route.ts` | Edge function: regex + input → simulation trace |
| `components/GraphView.tsx` | vis-network graph renderer with manual layout and collision detection |
| `components/RegexInput.tsx` | Regex input field with examples and syntax guide |
| `components/StepsPanel.tsx` | Color-coded Thompson construction step log |
| `app/page.tsx` | Theory page with all educational content |
| `app/simulator/page.tsx` | Simulator page with 3-column layout |

---

## How It Works

### Step 1 — User Input

The user types a regular expression (e.g., `(a|b)*abb`) into the input field. Input is debounced by 400ms before triggering conversion.

### Step 2 — Parsing

The regex string is passed to `parseRegex()`, a recursive descent parser that:
1. Strips whitespace
2. Parses with correct precedence: `?`/`+`/`*` > concatenation > `|`
3. Builds NFA fragments bottom-up via Thompson's construction rules
4. Records each construction step for display in the steps panel

### Step 3 — NFA Construction

Each parser rule directly calls the corresponding Thompson fragment builder:
- `buildSymbol(c)` → 2 states, 1 transition
- `buildUnion(f1, f2)` → 4 new ε-transitions, 2 new states
- `buildConcatenate(f1, f2)` → 1 new ε-transition, 0 new states
- `buildKleeneStar(f)` → 4 new ε-transitions, 2 new states

The final fragment is converted to an `NFA` object via `fragmentToNFA()`.

**Verified result for `(a|b)*abb`:** 14 states, 10 construction steps.

### Step 4 — DFA Conversion

`convertToDFA(nfa)` implements the subset construction:
1. Computes `ε-closure({startState})` → initial DFA state D0
2. For each unprocessed DFA state and each alphabet symbol, computes `ε-closure(move(D, a))`
3. New subsets become new DFA states (labeled D0, D1, ...)
4. A DFA state is accepting if its NFA subset contains the NFA accept state

**Verified result for `(a|b)*abb`:** 5 DFA states.

### Step 5 — DFA Minimization

`minimizeDFA(dfa)` implements Hopcroft's algorithm:
1. Removes unreachable states via BFS
2. Initial partition: `{accepting states}` vs `{non-accepting states}`
3. Iteratively splits groups when states transition to different partitions
4. Builds minimized DFA with states labeled M0, M1, ...
5. Returns partition mapping for display

**Verified result for `(a|b)*abb`:** 4 minimized states (dead/trap state eliminated).

### Step 6 — Graph Rendering

`GraphView.tsx` uses `vis-network` with:
- **Manual BFS layout** — no physics, positions are fixed
- **Collision detection** — straight edges that pass through intermediate nodes are automatically curved
- **Parallel edge fanning** — multiple transitions between same nodes use alternating CW/CCW curves
- **Canvas double rings** — accept states drawn via `afterDrawing` hook
- **Hover events** — `hoverEdge`/`blurEdge`/`hoverNode`/`blurNode` for interactive highlighting

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.2.0 | React framework, App Router, Edge Functions |
| **React** | 19.2.4 | UI component library |
| **TypeScript** | 5.7.3 | Static typing throughout |
| **Tailwind CSS** | 4.2.0 | Utility-first styling |
| **vis-network** | 10.0.2 | Graph visualization (canvas-based) |
| **Zustand** | 5.0.5 | Lightweight global state management |
| **Framer Motion** | 12.38.0 | Page transition animations |
| **Lucide React** | 0.564.0 | Icon library |
| **Radix UI** | various | Accessible headless UI primitives |

### Backend / API

| Technology | Purpose |
|------------|---------|
| **Next.js Edge Runtime** | Serverless API routes (`/api/convert`, `/api/simulate`) |
| **No external backend** | All automata logic runs in-process within edge functions |

### Deployment

| Platform | Purpose |
|----------|---------|
| **Vercel** | Hosting, edge function deployment, CDN |
| **GitHub** | Version control, CI/CD trigger |

---

## Folder Structure

```
/                               ← Repository root (Next.js app root)
│
├── app/                        ← Next.js App Router
│   ├── page.tsx                ← Theory page (route: /)
│   ├── layout.tsx              ← Root layout with metadata
│   ├── globals.css             ← Global CSS variables and theme
│   ├── simulator/
│   │   └── page.tsx            ← Simulator page (route: /simulator)
│   └── api/
│       ├── convert/
│       │   └── route.ts        ← POST /api/convert (NFA + DFA + MinDFA)
│       └── simulate/
│           └── route.ts        ← POST /api/simulate (string simulation)
│
├── components/
│   ├── GraphView.tsx           ← vis-network graph renderer
│   ├── RegexInput.tsx          ← Regex input with examples
│   ├── StepsPanel.tsx          ← Thompson construction steps log
│   ├── SimulationPanel.tsx     ← Simulation trace display
│   └── ui/                     ← Radix UI component library (shadcn/ui)
│
├── lib/
│   ├── automata.ts             ← Core: parser, Thompson's, subset construction, simulation
│   ├── minimize.ts             ← Hopcroft DFA minimization
│   ├── store.ts                ← Zustand global state
│   └── utils.ts                ← Tailwind class utilities
│
├── public/                     ← Static assets (icons, images)
├── styles/                     ← Additional global styles
│
├── backend/                    ← Express.js backend (local dev only, not deployed)
│   └── src/
│       ├── parser.ts           ← Alternative regex parser
│       ├── thompson.ts         ← Alternative Thompson implementation
│       ├── dfa.ts              ← Alternative DFA conversion
│       └── server.ts           ← Express server (port 4000)
│
├── package.json                ← Dependencies (Next.js app)
├── next.config.mjs             ← Next.js configuration
├── tsconfig.json               ← TypeScript configuration
├── vercel.json                 ← Vercel deployment configuration
└── README.md                   ← This file
```

---

## Installation & Setup

### Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher

### Clone the Repository

```bash
git clone https://github.com/adityagayake/Regular-expression-converter.git
cd Regular-expression-converter
```

### Install Dependencies

```bash
npm install
```

### Run in Development Mode

```bash
npm run dev
```

The application will be available at **http://localhost:3000**

- `/` → Theory page
- `/simulator` → Automata simulator

### Build for Production

```bash
npm run build
npm run start
```

### Environment Variables

No environment variables are required. The application is fully self-contained.

---

## Usage Guide

### Using the Simulator

1. Navigate to **http://localhost:3000/simulator** (or click "Try the Live Simulator" on the theory page)
2. Type a regular expression in the input field on the left panel
   - Supported operators: `|` (union), `*` (Kleene star), `+` (one or more), `?` (optional), `()` (grouping)
   - Example: `(a|b)*abb`
3. The graph updates automatically after 400ms
4. Use the **NFA / DFA / Min DFA** toggle in the header to switch views
5. In **Min DFA** mode, a partition mapping panel appears (top-right) showing which original DFA states were merged
6. Hover over nodes and edges to highlight connections
7. The **Construction Steps** panel (right) shows each Thompson fragment built

### Supported Regex Syntax

| Expression | Meaning | Example |
|------------|---------|---------|
| `a` | Literal symbol | `a` matches "a" |
| `AB` | Concatenation | `ab` matches "ab" |
| `A\|B` | Union | `a\|b` matches "a" or "b" |
| `A*` | Kleene star (0 or more) | `a*` matches "", "a", "aa", ... |
| `A+` | One or more | `a+` matches "a", "aa", ... |
| `A?` | Zero or one | `a?` matches "" or "a" |
| `(A)` | Grouping | `(ab)+` matches "ab", "abab", ... |

---

## Algorithm Correctness Validation

The following test cases verify the correctness of all three algorithms:

| Regex | NFA States | DFA States | Min DFA States | Notes |
|-------|-----------|-----------|---------------|-------|
| `(a\|b)*abb` | 14 | 5 | 4 | Classic textbook example |
| `a*b*` | 8 | 3 | 2 | D0 and D1 are equivalent |
| `(ab)+` | 6 | — | — | Plus operator |
| `a?b` | 6 | — | — | Optional operator |

**Simulation verification for `(a|b)*abb`:**

| Input | Expected | Result |
|-------|----------|--------|
| `abb` | ACCEPTED | ✔ |
| `aabb` | ACCEPTED | ✔ |
| `babb` | ACCEPTED | ✔ |
| `ab` | REJECTED | ✔ |
| `bba` | REJECTED | ✔ |
| `` (empty) | REJECTED | ✔ |

---

## Live Demo

The application is deployed on Vercel and accessible at:

**https://regular-expression-converter.vercel.app**

*(URL may vary — check the Vercel dashboard for the exact deployment URL)*

---

## References

1. Hopcroft, J. E., Motwani, R., & Ullman, J. D. (2006). *Introduction to Automata Theory, Languages, and Computation* (3rd ed.). Pearson.
2. Thompson, K. (1968). Programming techniques: Regular expression search algorithm. *Communications of the ACM*, 11(6), 419–422.
3. Hopcroft, J. E. (1971). An n log n algorithm for minimizing states in a finite automaton. *Theory of Machines and Computations*, 189–196.
4. Sipser, M. (2012). *Introduction to the Theory of Computation* (3rd ed.). Cengage Learning.

---

*This project was developed as part of a formal languages and automata theory course. All algorithms are implemented from first principles without reliance on external automata libraries.*
