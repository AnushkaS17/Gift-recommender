// API Configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
// API key will be injected by server or set directly
const API_KEY = (() => {
    // Try to get from window if injected by server
    if (typeof window !== 'undefined' && window.OPENROUTER_API_KEY && window.OPENROUTER_API_KEY !== '{{ OPENROUTER_API_KEY }}') {
        return window.OPENROUTER_API_KEY;
    }
    // Fallback: replace this with your actual API key for testing
    return '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';
})();

// DOM Elements
const form = document.getElementById('giftForm');
const questionnaire = document.getElementById('questionnaire');
const loading = document.getElementById('loading');
const results = document.getElementById('results');
const error = document.getElementById('error');
const giftList = document.getElementById('giftList');
const submitBtn = document.getElementById('submitBtn');
const newSearchBtn = document.getElementById('newSearchBtn');
const retryBtn = document.getElementById('retryBtn');
const errorMessage = document.getElementById('errorMessage');

// State Management
let currentFormData = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    feather.replace(); // Initialize Feather icons
});

/**
 * Initialize all event listeners
 */
function initializeEventListeners() {
    form.addEventListener('submit', handleFormSubmit);
    newSearchBtn.addEventListener('click', showQuestionnaire);
    retryBtn.addEventListener('click', handleRetry);
}

/**
 * Handle form submission
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    
    // Get form data
    const formData = new FormData(form);
    currentFormData = {
        age: formData.get('age'),
        occasion: formData.get('occasion'),
        interests: formData.get('interests'),
        relationship: formData.get('relationship'),
        budget: formData.get('budget')
    };

    // Validate form data
    if (!validateFormData(currentFormData)) {
        showError('Please fill in all required fields.');
        return;
    }

    // Show loading state
    showLoading();

    try {
        // Generate gift recommendations
        const recommendations = await generateGiftRecommendations(currentFormData);
        
        // Display results
        displayResults(recommendations);
    } catch (err) {
        console.error('Error generating recommendations:', err);
        showError(getErrorMessage(err));
    }
}

/**
 * Validate form data
 */
function validateFormData(data) {
    return data.age && data.occasion && data.interests && data.relationship && data.budget;
}

/**
 * Generate gift recommendations using OpenRouter API
 */
async function generateGiftRecommendations(formData) {
    const prompt = createPrompt(formData);
    
    const requestBody = {
        model: "anthropic/claude-3-haiku", // Using a cost-effective model
        messages: [
            {
                role: "user",
                content: prompt
            }
        ],
        max_tokens: 1000,
        temperature: 0.7
    };

    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'AI Gift Recommender'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from API');
    }

    const content = data.choices[0].message.content;
    return parseRecommendations(content);
}

/**
 * Create a detailed prompt for the AI
 */
function createPrompt(formData) {
    return `You are an expert gift consultant. Based on the following information about a gift recipient, provide exactly 4 personalized gift recommendations.

Recipient Details:
- Age: ${formData.age}
- Occasion: ${formData.occasion}
- Interests/Hobbies: ${formData.interests}
- Relationship: ${formData.relationship}
- Budget: ${formData.budget}

Please provide 4 gift recommendations in the following JSON format:
{
  "recommendations": [
    {
      "title": "Gift Name",
      "description": "A detailed 2-3 sentence description explaining why this gift is perfect for the recipient, considering their interests, the occasion, and your relationship with them."
    }
  ]
}

Requirements:
- Each gift should be within the specified budget range
- Consider the recipient's age and interests
- Make recommendations appropriate for the occasion and relationship
- Provide diverse options (mix of practical, experiential, and personal gifts)
- Keep descriptions concise but compelling
- Ensure all recommendations are realistic and purchasable

Return only the JSON response, no additional text.`;
}

/**
 * Parse AI response to extract recommendations
 */
function parseRecommendations(content) {
    try {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in response');
        }

        const parsed = JSON.parse(jsonMatch[0]);
        
        if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
            throw new Error('Invalid recommendations format');
        }

        return parsed.recommendations.filter(rec => rec.title && rec.description);
    } catch (err) {
        console.error('Error parsing recommendations:', err);
        
        // Fallback: try to parse as plain text
        return parseTextRecommendations(content);
    }
}

/**
 * Fallback parser for plain text responses
 */
function parseTextRecommendations(content) {
    const lines = content.split('\n').filter(line => line.trim());
    const recommendations = [];
    
    let currentTitle = '';
    let currentDescription = '';
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip empty lines and JSON markers
        if (!trimmed || trimmed === '{' || trimmed === '}' || trimmed.includes('"recommendations"')) {
            continue;
        }
        
        // Check if this looks like a title (short line, often numbered or with special formatting)
        if (trimmed.length < 100 && (
            /^\d+\./.test(trimmed) || 
            /^[A-Z]/.test(trimmed) && !trimmed.includes('.') ||
            trimmed.includes(':')
        )) {
            // Save previous recommendation if we have one
            if (currentTitle && currentDescription) {
                recommendations.push({
                    title: currentTitle.replace(/^\d+\.\s*/, '').replace(/:$/, ''),
                    description: currentDescription.trim()
                });
            }
            
            currentTitle = trimmed;
            currentDescription = '';
        } else if (trimmed.length > 20) {
            // This looks like a description
            currentDescription += (currentDescription ? ' ' : '') + trimmed;
        }
    }
    
    // Don't forget the last recommendation
    if (currentTitle && currentDescription) {
        recommendations.push({
            title: currentTitle.replace(/^\d+\.\s*/, '').replace(/:$/, ''),
            description: currentDescription.trim()
        });
    }
    
    // If we still don't have good recommendations, create generic ones
    if (recommendations.length === 0) {
        return [
            {
                title: "Personalized Gift Suggestion",
                description: "Based on your preferences, consider a thoughtful gift that reflects their interests and fits your budget."
            }
        ];
    }
    
    return recommendations.slice(0, 4); // Limit to 4 recommendations
}

/**
 * Display the gift recommendations
 */
function displayResults(recommendations) {
    giftList.innerHTML = '';
    
    if (!recommendations || recommendations.length === 0) {
        showError('No recommendations could be generated. Please try again with different preferences.');
        return;
    }
    
    recommendations.forEach((gift, index) => {
        const giftElement = createGiftElement(gift, index + 1);
        giftList.appendChild(giftElement);
    });
    
    showResults();
}

/**
 * Create a gift recommendation element
 */
function createGiftElement(gift, index) {
    const div = document.createElement('div');
    div.className = 'gift-item';
    div.style.animationDelay = `${index * 0.1}s`;
    
    div.innerHTML = `
        <h3>${escapeHtml(gift.title)}</h3>
        <p>${escapeHtml(gift.description)}</p>
    `;
    
    return div;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show different sections
 */
function showQuestionnaire() {
    hideAllSections();
    questionnaire.classList.remove('hidden');
    
    // Reset form
    form.reset();
    currentFormData = null;
}

function showLoading() {
    hideAllSections();
    loading.classList.remove('hidden');
}

function showResults() {
    hideAllSections();
    results.classList.remove('hidden');
}

function showError(message) {
    hideAllSections();
    errorMessage.textContent = message;
    error.classList.remove('hidden');
}

function hideAllSections() {
    questionnaire.classList.add('hidden');
    loading.classList.add('hidden');
    results.classList.add('hidden');
    error.classList.add('hidden');
}

/**
 * Handle retry button click
 */
function handleRetry() {
    if (currentFormData) {
        handleFormSubmitWithData(currentFormData);
    } else {
        showQuestionnaire();
    }
}

/**
 * Retry with existing form data
 */
async function handleFormSubmitWithData(formData) {
    showLoading();
    
    try {
        const recommendations = await generateGiftRecommendations(formData);
        displayResults(recommendations);
    } catch (err) {
        console.error('Error on retry:', err);
        showError(getErrorMessage(err));
    }
}

/**
 * Get user-friendly error message
 */
function getErrorMessage(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('unauthorized') || message.includes('401')) {
        return 'API key is invalid or missing. Please check your OpenRouter API key configuration.';
    } else if (message.includes('quota') || message.includes('limit')) {
        return 'API usage limit reached. Please try again later or check your OpenRouter account.';
    } else if (message.includes('network') || message.includes('fetch')) {
        return 'Network connection issue. Please check your internet connection and try again.';
    } else if (message.includes('timeout')) {
        return 'Request timed out. Please try again.';
    } else if (message.includes('rate limit')) {
        return 'Too many requests. Please wait a moment and try again.';
    } else {
        return `Unable to generate recommendations: ${error.message}. Please try again.`;
    }
}

/**
 * Add loading state to submit button
 */
function setButtonLoading(isLoading) {
    const btnText = submitBtn.querySelector('.btn-text');
    const btnIcon = submitBtn.querySelector('.btn-icon');
    
    if (isLoading) {
        submitBtn.disabled = true;
        btnText.textContent = 'Generating...';
        btnIcon.style.display = 'none';
    } else {
        submitBtn.disabled = false;
        btnText.textContent = 'Get Gift Recommendations';
        btnIcon.style.display = 'block';
    }
}

// Add loading state management to form submission
const originalShowLoading = showLoading;
showLoading = function() {
    setButtonLoading(true);
    originalShowLoading();
};

const originalShowResults = showResults;
showResults = function() {
    setButtonLoading(false);
    originalShowResults();
};

const originalShowError = showError;
showError = function(message) {
    setButtonLoading(false);
    originalShowError(message);
};
