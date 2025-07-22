# Application Features

This document outlines the major features of the application, complete with descriptions and references to the relevant source code files.

## 1. User Authentication and Management
- **Description:** Handles user registration, login, session management, and viewing user profiles.
- **Code References:**
  - **Backend Routes:** `src/routes/auth.ts`, `src/routes/user.ts`
  - **Backend Logic:** `src/middleware/auth.ts`, `src/utils/password.ts`, `src/modules/user/`
  - **Frontend Pages:** `client/src/pages/Login.tsx`, `client/src/pages/Register.tsx`, `client/src/pages/Profile.tsx`
  - **Frontend Context:** `client/src/contexts/AuthContext.tsx`
  - **Frontend API Service:** `client/src/services/userApi.ts`

## 2. Document Management & Processing
- **Description:** Allows users to upload, manage, and process documents, likely for analysis or use in other features.
- **Code References:**
  - **Backend Routes:** `src/routes/documents.ts`
  - **Backend Logic:** `src/services/documentProcessor.ts`, `src/modules/documents/`
  - **Vector Database Integration:** `src/services/qdrant.ts`
  - **Frontend Pages:** `client/src/pages/Documents.tsx`
  - **Frontend API Service:** `client/src/services/documentsApi.ts`

## 3. Intelligent Quiz System
- **Description:** A comprehensive quiz system that includes AI-powered creation, administration, gamification, and user participation.
- **Code References:**
  - **Backend Logic:** `src/modules/quiz/`, `src/services/gamification.ts`
  - **AI Integration:** `src/services/gemini.ts`
  - **Frontend Components:** `client/src/components/IntelligentQuizCreator.tsx`, `client/src/components/AdminQuizManager.tsx`, `client/src/components/Quiz/`
  - **Frontend API Service:** `client/src/services/quizApi.ts`

## 4. Workspace & Note Taking
- **Description:** Provides users with a personal workspace to create, manage, and organize notes and other content.
- **Code References:**
  - **Backend Routes:** `src/routes/workspace.ts`, `src/routes/notes.ts`
  - **Backend Logic:** `src/services/workspaceService.ts`, `src/services/notesService.ts`, `src/modules/workspace/`
  - **Frontend Pages:** `client/src/pages/Workspace.tsx`
  - **Frontend Components:** `client/src/components/Workspace/`
  - **Frontend API Services:** `client/src/services/workspaceApi.ts`, `client/src/services/notesApi.ts`

## 5. AI-Powered Chat
- **Description:** A chat interface that leverages the Gemini AI model to interact with users.
- **Code References:**
  - **Backend Routes:** `src/routes/chat.ts`
  - **Backend Logic:** `src/services/gemini.ts`, `src/services/contextManager.ts`
  - **Frontend Pages:** `client/src/pages/Chat.tsx`

## 6. Admin Dashboard
- **Description:** A dedicated interface for administrators to manage application features, such as the quiz system.
- **Code References:**
  - **Frontend Pages:** `client/src/pages/Admin.tsx`
  - **Frontend Components:** `client/src/components/AdminQuizManager.tsx`

## 7. FAQ Section
- **Description:** A section to display and manage Frequently Asked Questions.
- **Code References:**
  - **Backend Routes:** `src/routes/faq.ts`
  - **Frontend Pages:** `client/src/pages/FAQList.tsx`, `client/src/pages/FAQDetail.tsx`

## 8. Flip Mode
- **Description:** A unique feature, likely for study or review, that "flips" content, possibly between a question and answer or different views.
- **Code References:**
  - **Backend Logic:** `src/services/flip-mode.ts`
  - **Frontend Component:** `client/src/components/FlipModeDemo.tsx`
