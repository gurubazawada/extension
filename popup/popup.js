console.log("popup script running");

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

// --- Add the async getBestimate function ---
async function getBestimate(propertyData) {
  console.log("GET BESTIMATE CALLED in popup.js with propertyData:", propertyData);
  // Construct the API endpoint URL using propertyData
  const baseUrl = 'https://dev-nextplaceportal-api.azurewebsites.net/Properties/Search'; // Replace with your API endpoint
  const regex = /([\d\w\s.#\-]+),\s*([\w\s]+),\s*([A-Z]{2})\s+(\d{5})/;
  const match = propertyData.address.match(regex);
  if (!match) {
    console.error("Regex failed. propertyData.address:", propertyData.address);
    throw new Error('Failed to parse address: ' + propertyData.address);  
  }

  const street = match[1].trim();
  const city = match[2].trim();
  const state = match[3].trim();
  const zip = match[4].trim();

  // URL encode the street address and city
  const encodedStreet = encodeURIComponent(street);
  const encodedCity = encodeURIComponent(city);

  console.log("street:", street);
  console.log("encodedAddress:", encodedStreet);

  const apiKey = "DormBuilders"
  const apiUrl = `${baseUrl}?&accountKey=${apiKey}&AddressFilter=${encodedStreet}&CityFilter=${encodedCity}&StateFilter=${state}&ZipCodeFilter=${zip}&ItemsPerPage=1`

  console.log("API CALL URL:", apiUrl);

  const nextplaceRes = await fetch(
    apiUrl, {
      method: 'GET'
    });
  
  console.log("Response status:", nextplaceRes.status);

  if (!nextplaceRes.ok) {
    throw new Error('Failed to fetch property data from Nextplace');
  }

  const nextplaceData = await nextplaceRes.json();
  if (nextplaceData.length === 0) {
    throw new Error('No property data found');
  }

  // const property = nextplaceData[0];
  const bestimatePrice = await nextplaceData[0].averageSalePrice;
  console.log("IN BESTIMATE PRICE: ", bestimatePrice);
  return bestimatePrice

}

// Calculate investment score based on price difference
function calculateInvestmentScore(propertyData, bestimatePrice) {
  try {
    const listingPrice = parseInt(propertyData.listingPrice.replace(/[^0-9]/g, ''));
    // For now, bestimate is 5% lower than listing
    // const bestimatePrice = listingPrice * 0.95; 
    // Calculate price difference percentage
    const priceDiff = listingPrice - bestimatePrice;
    const priceDiffPercentage = (priceDiff / listingPrice) * 100;
    // Base score calculation
    let score = 50; // Start at neutral and adjust accordingly
    score += priceDiffPercentage * 10;
    const sqft = parseInt(propertyData.sqft.replace(/[^0-9]/g, ''));
    const pricePerSqft = listingPrice / sqft;
    if (pricePerSqft < 200) score += 10;
    else if (pricePerSqft > 400) score -= 10;
    const beds = parseInt(propertyData.beds);
    if (beds >= 3 && beds <= 4) score += 5;
    console.log("Investment score calculation:", Math.round(Math.max(0, Math.min(100, score))));
    return Math.round(Math.max(0, Math.min(100, score)));

  } catch (error) {
    console.error('Error calculating investment score:', error);
    return 70;
  }
}

// Update the gauge visualization
function updateGauge(score) {
  const maxOffset = 339.292;
  const offset = maxOffset - (score / 100) * maxOffset;
  elements.gaugeValue.style.strokeDasharray = maxOffset;
  elements.gaugeValue.style.strokeDashoffset = offset;
  elements.gaugeText.textContent = Math.round(score);
  let color;
  if (score >= 80) color = '#0cce6b';
  else if (score >= 60) color = '#1a73e8';
  else if (score >= 40) color = '#fbbc04';
  else color = '#ea4335';
  elements.gaugeValue.style.stroke = color;
  elements.gaugeText.style.fill = color;
}

// Use the async getBestimate to update valuation display
async function updatePropertyUI(propertyData, bestimatePrice) {
  console.log("updatePropertyUI called with propertyData:", propertyData);
  
  if (!propertyData || Object.keys(propertyData).length === 0) {
    console.log("updatePropertyUI: No property data available.");
    elements.address.textContent = 'No property data available';
    return;
  }
  
  console.log("Updating UI with property data...");
  elements.address.textContent = propertyData.address;
  elements.listingPrice.textContent = propertyData.listingPrice;
  elements.beds.textContent = `${propertyData.beds} beds`;
  elements.baths.textContent = `${propertyData.baths} baths`;
  elements.sqft.textContent = `${propertyData.sqft} sqft`;
  elements.daysOnMarket.textContent = propertyData.daysOnMarket || 'N/A';
  
  // console.log("Before calling getBestimate with propertyData:", propertyData);
  // const bestimatePrice = await getBestimate(propertyData);
  console.log("getBestimate returned:", bestimatePrice);
  
  const valuationFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(bestimatePrice);
  elements.valuation.textContent = valuationFormatted;
  
  // Get and update repair estimate (as before)
  const repairEstimate = await getRepairEstimate(propertyData);
  elements.repairCosts.textContent = repairEstimate;
  
  const score = calculateInvestmentScore(propertyData, bestimatePrice);
  updateGauge(score);
}

// Get repair cost estimate using Gemini

// should the prompt also include bestimate vs listing price diff?

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
  console.log("Bestimate score for Gemini query:", elements.valuation.textContent);

  const context = `Property Details:
- Address: ${propertyData.address}
- List Price: ${propertyData.listingPrice}
- Bedrooms: ${propertyData.beds}
- Bathrooms: ${propertyData.baths}
- Square Footage: ${propertyData.sqft}
- Our Estimated Value ("Bestimate"): ${elements.valuation.textContent}
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
console.log("Sending GET_PROPERTY_DATA message on initial load...");
chrome.runtime.sendMessage({ type: 'GET_PROPERTY_DATA' }, async (response) => {
  console.log("GET_PROPERTY_DATA response received:", response);
  const bestimatePrice = await getBestimate(response);
  updatePropertyUI(response, bestimatePrice);
});