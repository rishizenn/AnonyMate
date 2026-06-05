# AnonyMate - Anonymous Peer Support Platform

A safe, anonymous platform for campus students to share concerns, seek peer support, and build a supportive community.

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (v14 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: 
     ```bash
     node --version
     npm --version
     ```

2. **A code editor** (VS Code recommended)
   - Download from: https://code.visualstudio.com/

---

## 🚀 Installation

### Windows Setup

#### Step 1: Create Project Folder
```cmd
# Navigate to your desired location (e.g., Desktop)
cd Desktop

# Create project folder
mkdir anonymate-project
cd anonymate-project
```

#### Step 2: Create React App
```cmd
# Create a new React application
npx create-react-app anonymate

# Navigate into the project
cd anonymate
```

#### Step 3: Install Dependencies
```cmd
# Install required packages
npm install lucide-react firebase
```

#### Step 4: Add Project Files

1. **Replace `src/App.js`:**
   - Delete all content in `src/App.js`
   - Copy the entire content from `AnonyMate.jsx`
   - Paste into `src/App.js`
   - Save the file

2. **Create `src/firebase.js`:**
   - Create a new file: `src/firebase.js`
   - Copy the entire content from `firebase.js`
   - Paste into `src/firebase.js`
   - Save the file

#### Step 5: Run the Application
```cmd
npm run dev
```
---

### Linux/WSL Setup

#### Step 1: Open Terminal and Create Project Folder
```bash
# Navigate to home directory
cd ~

# Create project folder
mkdir anonymate-project
cd anonymate-project
```

#### Step 2: Create React App
```bash
# Create a new React application
npx create-react-app anonymate

# Navigate into the project
cd anonymate
```

#### Step 3: Install Dependencies
```bash
# Install required packages
npm install lucide-react firebase
```

#### Step 4: Add Project Files

1. **Replace `src/App.js`:**
   ```bash
   # Open the project in VS Code (if using WSL with VS Code)
   code .
   ```
   - Delete all content in `src/App.js`
   - Copy the entire content from `AnonyMate.jsx`
   - Paste into `src/App.js`
   - Save the file (Ctrl+S)

2. **Create `src/firebase.js`:**
   - Create a new file: `src/firebase.js`
   - Copy the entire content from `firebase.js`
   - Paste into `src/firebase.js`
   - Save the file (Ctrl+S)


#### Step 5: Run the Application
```bash
npm run dev
```

---

**Happy Supporting! 💙**