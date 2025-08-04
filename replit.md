# AI Gift Recommender

## Overview

This is a web-based AI-powered gift recommendation application that helps users find perfect gifts for their loved ones. The application collects user preferences through a questionnaire and uses AI to generate personalized gift suggestions. Built as a single-page application using vanilla HTML, CSS, and JavaScript, it integrates with OpenRouter's API to leverage AI models for generating thoughtful gift recommendations based on recipient details like age, interests, occasion, relationship, and budget.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

**Frontend Architecture**
- Single-page application (SPA) built with vanilla HTML, CSS, and JavaScript
- Responsive design using CSS Grid and Flexbox for cross-device compatibility
- Modern CSS with custom properties for consistent theming and maintainability
- Feather Icons integration for consistent iconography
- Google Fonts (Inter) for typography

**Form Management**
- Progressive questionnaire flow collecting recipient details
- Client-side form validation and state management
- Dynamic UI state transitions between questionnaire, loading, results, and error states
- Form data persistence for retry functionality

**AI Integration**
- OpenRouter API integration for accessing multiple AI models
- RESTful API communication using fetch API
- Environment variable configuration for API key management
- Error handling for API failures with retry mechanisms

**User Experience Design**
- Multi-step user flow: questionnaire → loading → results → new search
- Loading states with visual feedback during API calls
- Error handling with user-friendly messages and retry options
- Responsive design adapting to different screen sizes

**State Management**
- Simple JavaScript state management for form data persistence
- UI state transitions handled through DOM manipulation
- Current form data stored for retry functionality

## External Dependencies

**API Services**
- OpenRouter API - AI model access for generating gift recommendations
- Requires OPENROUTER_API_KEY environment variable

**CDN Dependencies**
- Google Fonts API - Inter font family for typography
- Feather Icons CDN - Icon library for UI elements

**Browser APIs**
- Fetch API - HTTP requests to OpenRouter
- DOM API - Dynamic content manipulation
- FormData API - Form handling and validation
- Environment variables through process.env (requires build system or runtime support)