// API Configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = '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'; // direct key for testing

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

document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    feather.replace();
});

function initializeEventListeners() {
    form.addEventListener('submit', handleFormSubmit);
    newSearchBtn.addEventListener('click', showQuestionnaire);
    retryBtn.addEventListener('click', handleRetry);
}

async function handleFormSubmit(event) {
    event.preventDefault();

    const formData = new FormData(form);
    currentFormData = {
        age: formData.get('age'),
        occasion: formData.get('occasion'),
        interests: formData.get('interests'),
        relationship: formData.get('relationship'),
        budget: formData.get('budget')
    };

    if (!validateFormData(currentFormData)) {
        showError('Please fill in all required fields.');
        return;
    }

    showLoading();

    try {
        const recommendations = await generateGiftRecommendations(currentFormData);
        displayResults(recommendations);
    } catch (err) {
        console.error('Error generating recommendations:', err);
        showError(getErrorMessage(err));
    }
}

function validateFormData(data) {
    return data.age && data.occasion && data.interests && data.relationship && data.budget;
}

async function generateGiftRecommendations(formData) {
    const prompt = createPrompt(formData);

    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'AI Gift Recommender'
        },
        body: JSON.stringify({
            model: "anthropic/claude-3-haiku",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1000,
            temperature: 0.7
        })
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

function parseRecommendations(content) {
    try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found');
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.recommendations?.filter(r => r.title && r.description) || [];
    } catch {
        return parseTextRecommendations(content);
    }
}

function parseTextRecommendations(content) {
    const lines = content.split('\n').filter(Boolean);
    const recommendations = [];
    let currentTitle = '', currentDescription = '';
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length < 100 && (/^\d+\./.test(trimmed) || /^[A-Z]/.test(trimmed))) {
            if (currentTitle && currentDescription) {
                recommendations.push({ title: currentTitle, description: currentDescription });
            }
            currentTitle = trimmed.replace(/^\d+\.\s*/, '');
            currentDescription = '';
        } else {
            currentDescription += (currentDescription ? ' ' : '') + trimmed;
        }
    }
    if (currentTitle && currentDescription) recommendations.push({ title: currentTitle, description: currentDescription });
    return recommendations.slice(0, 4);
}

function displayResults(recommendations) {
    giftList.innerHTML = '';
    if (!recommendations.length) {
        showError('No recommendations could be generated.');
        return;
    }
    recommendations.forEach((gift, i) => {
        const div = document.createElement('div');
        div.className = 'gift-item';
        div.style.animationDelay = `${i * 0.1}s`;
        div.innerHTML = `<h3>${escapeHtml(gift.title)}</h3><p>${escapeHtml(gift.description)}</p>`;
        giftList.appendChild(div);
    });
    showResults();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showQuestionnaire() {
    hideAllSections(); questionnaire.classList.remove('hidden');
    form.reset(); currentFormData = null;
}

function showLoading() {
    hideAllSections(); loading.classList.remove('hidden');
    setButtonLoading(true);
}

function showResults() {
    hideAllSections(); results.classList.remove('hidden');
    setButtonLoading(false);
}

function showError(message) {
    hideAllSections(); errorMessage.textContent = message;
    error.classList.remove('hidden');
    setButtonLoading(false);
}

function hideAllSections() {
    [questionnaire, loading, results, error].forEach(el => el.classList.add('hidden'));
}

function handleRetry() {
    currentFormData ? handleFormSubmitWithData(currentFormData) : showQuestionnaire();
}

async function handleFormSubmitWithData(data) {
    showLoading();
    try {
        const recs = await generateGiftRecommendations(data);
        displayResults(recs);
    } catch (err) {
        console.error(err);
        showError(getErrorMessage(err));
    }
}

function getErrorMessage(error) {
    const message = error.message.toLowerCase();
    if (message.includes('unauthorized') || message.includes('401')) return 'API key is invalid or missing.';
    if (message.includes('quota') || message.includes('limit')) return 'API usage limit reached.';
    if (message.includes('network')) return 'Network error. Please check your internet.';
    return `Error: ${error.message}`;
}

function setButtonLoading(isLoading) {
    const btnText = submitBtn.querySelector('.btn-text');
    const btnIcon = submitBtn.querySelector('.btn-icon');
    submitBtn.disabled = isLoading;
    btnText.textContent = isLoading ? 'Generating...' : 'Get Gift Recommendations';
    btnIcon.style.display = isLoading ? 'none' : 'block';
}
