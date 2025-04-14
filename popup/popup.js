// Cache DOM elements
const elements = {
  address: document.getElementById('property-address'),
  listingPrice: document.getElementById('listing-price'),
  beds: document.getElementById('beds'),
  baths: document.getElementById('baths'),
  sqft: document.getElementById('sqft'),
  valuation: document.getElementById('valuation'),
  repairCosts: document.getElementById('repair-costs'),
  daysOnMarket: document.getElementById('days-on-market'),
  chatHistory: document.getElementById('chat-history'),
  questionInput: document.getElementById('user-question'),
  sendButton: document.getElementById('send-btn'),
  gaugeValue: document.querySelector('.gauge-value'),
  gaugeText: document.querySelector('.gauge-text')
};

// Calculate investment score based on price difference
function calculateInvestmentScore(propertyData) {
  try {
    const listingPrice = parseInt(propertyData.listingPrice.replace(/[^0-9]/g, ''));
    const bestimatePrice = listingPrice * 0.95; // Our estimate is 5% lower
    
    // Calculate price difference percentage
    const priceDiff = listingPrice - bestimatePrice;
    const priceDiffPercentage = (priceDiff / listingPrice) * 100;
    
    // Base score calculation
    // Higher difference = better investment potential
    let score = 50; // Start at neutral
    
    // Add points based on price difference
    score += priceDiffPercentage * 10; // Each % difference adds 10 points
    
    // Additional factors
    const sqft = parseInt(propertyData.sqft.replace(/[^0-9]/g, ''));
    const pricePerSqft = listingPrice / sqft;
    
    // Adjust for price per sqft (local market factors)
    if (pricePerSqft < 200) score += 10;
    else if (pricePerSqft > 400) score -= 10;
    
    // Adjust for property size
    const beds = parseInt(propertyData.beds);
    if (beds >= 3 && beds <= 4) score += 5; // Ideal family size
    
    // Ensure score stays within 0-100 and round to nearest integer
    return Math.round(Math.max(0, Math.min(100, score)));
  } catch (error) {
    console.error('Error calculating investment score:', error);
    return 70; // Default fallback score
  }
}

// Update the gauge visualization
function updateGauge(score) {
  // Calculate stroke-dashoffset
  // Circle circumference is 339.292 (2 * π * 54)
  const maxOffset = 339.292;
  const offset = maxOffset - (score / 100) * maxOffset;
  
  elements.gaugeValue.style.strokeDasharray = maxOffset;
  elements.gaugeValue.style.strokeDashoffset = offset;
  elements.gaugeText.textContent = Math.round(score);

  // Update color based on score
  let color;
  if (score >= 80) color = '#0cce6b'; // Green
  else if (score >= 60) color = '#1a73e8'; // Blue
  else if (score >= 40) color = '#fbbc04'; // Yellow
  else color = '#ea4335'; // Red

  elements.gaugeValue.style.stroke = color;
  elements.gaugeText.style.fill = color;
}

// Dummy valuation function (hardcoded to 5% lower than listing)
function getValuation(propertyData) {
  const basePrice = parseInt(propertyData.listingPrice.replace(/[^0-9]/g, ''));
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(basePrice * 0.95);
}

// Get repair cost estimate using Gemini
async function getRepairEstimate(propertyData) {
  const geminiApiKey = 'AIzaSyD1AoYOKFwzfzOuZkjunOuIkQH2ug6rQGU';
  const prompt = `You are an experienced real estate investor. Based on this property's description and details, estimate the repair costs needed to flip this property for maximum profit. Only provide a single number representing the average repair cost estimate.

Property Details:
- Square Footage: ${propertyData.sqft}
- Year Built: Unknown
- Current Condition Description: ${propertyData.description}

Format your response as a single number without commas, currency symbols, or explanation. For example:
25000`;

  try {
    const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!apiResponse.ok) throw new Error('Failed to get repair estimate');
    
    const data = await apiResponse.json();
    const llmResponse = data.candidates[0].content.parts[0].text.trim();
    // Extract just the number from the response
    const number = parseInt(llmResponse.replace(/[^0-9]/g, ''));
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(number);
  } catch (error) {
    console.error('Error getting repair estimate:', error);
    return 'Unable to estimate repairs';
  }
}

// Update UI with property data
async function updatePropertyUI(propertyData) {
  if (!propertyData || Object.keys(propertyData).length === 0) {
    elements.address.textContent = 'No property data available';
    return;
  }

  elements.address.textContent = propertyData.address;
  elements.listingPrice.textContent = propertyData.listingPrice;
  elements.beds.textContent = `${propertyData.beds} beds`;
  elements.baths.textContent = `${propertyData.baths} baths`;
  elements.sqft.textContent = `${propertyData.sqft} sqft`;
  elements.daysOnMarket.textContent = propertyData.daysOnMarket || 'N/A';

  // Update valuation
  const valuation = getValuation(propertyData);
  elements.valuation.textContent = valuation;

  // Get and update repair estimate
  const repairEstimate = await getRepairEstimate(propertyData);
  elements.repairCosts.textContent = repairEstimate;

  // Calculate and update investment score
  const score = calculateInvestmentScore(propertyData);
  updateGauge(score);
}

// Chat message handling
function appendChatMessage(sender, message, isError = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${sender.toLowerCase()}-message`;
  messageDiv.innerHTML = `<strong>${sender}:</strong> ${message}`;
  if (isError) messageDiv.style.color = '#dc2626';
  elements.chatHistory.appendChild(messageDiv);
  elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;
}

// Function to query Gemini API
async function queryGemini(question, propertyData) {
  const geminiApiKey = 'AIzaSyD1AoYOKFwzfzOuZkjunOuIkQH2ug6rQGU';
  const score = calculateInvestmentScore(propertyData);

  const context = `Property Details:
- Address: ${propertyData.address}
- List Price: ${propertyData.listingPrice}
- Bedrooms: ${propertyData.beds}
- Bathrooms: ${propertyData.baths}
- Square Footage: ${propertyData.sqft}
- Our Estimated Value: ${elements.valuation.textContent}
- Repair Cost Estimate: ${elements.repairCosts.textContent}
- Days on Market: ${propertyData.daysOnMarket || 'N/A'}
- Investment Score: ${score}/100

Property Description: ${propertyData.description}

You are an expert real estate AI assistant named Bestimate. Provide thoughtful analysis about this property using the details above. Consider repair costs and days on market when analyzing investment potential. Only answer questions that are relevant to real estate and this specific property.

Question: ${question}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: context }]
        }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Gemini API Error:', error);
      throw new Error(error.error?.message || 'Failed to get response from Gemini');
    }

    const data = await response.json();
    
    if (data.promptFeedback?.blockReason) {
      throw new Error('Response blocked for safety reasons');
    }

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response format from API');
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error calling Gemini:', error);
    throw error;
  }
}

// Handle chat submission
elements.sendButton.addEventListener('click', async () => {
  const question = elements.questionInput.value.trim();
  if (!question) return;

  // Clear input
  elements.questionInput.value = '';

  // Display user question
  appendChatMessage('You', question);

  try {
    // Get current property data
    chrome.runtime.sendMessage({ type: 'GET_PROPERTY_DATA' }, async (propertyData) => {
      if (!propertyData || Object.keys(propertyData).length === 0) {
        appendChatMessage('System', 'No property data available', true);
        return;
      }

      try {
        const response = await queryGemini(question, propertyData);
        appendChatMessage('Assistant', response);
      } catch (error) {
        appendChatMessage('System', `Error: ${error.message}`, true);
      }
    });
  } catch (error) {
    appendChatMessage('System', 'Error: Could not process your question', true);
  }
});

// Handle "Enter" key in question input
elements.questionInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    elements.sendButton.click();
  }
});

// Initial load of property data
chrome.runtime.sendMessage({ type: 'GET_PROPERTY_DATA' }, (response) => {
  updatePropertyUI(response);
});
