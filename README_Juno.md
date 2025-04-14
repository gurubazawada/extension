# README for Juno - Price Estimation API Integration

Hi Juno,

This document provides instructions for integrating the new price estimation API into the Zillow extension.

## Overview

The current extension scrapes property data from Zillow pages and displays a "Bestimate" price. Your task is to replace the current placeholder price calculation with a call to the new price estimation API.

## Key File: `content.js`

All the relevant logic for price estimation and UI injection is located in `content.js`.

### Current Implementation

The current implementation calculates the "Bestimate" by simply taking 95% of the listing price.

```javascript
const bestimatePriceFormatted = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
}).format(listingPrice * 0.95);
```

**Your task is to replace the `listingPrice * 0.95` calculation with a call to the new price estimation API.**

### Data Scraping

The `content.js` file also scrapes property data from Zillow pages, including:

*   Address
*   Listing Price
*   Square Footage
*   Number of Beds
*   Number of Baths
*   Property Description

You may need to use this data to construct the request to the new API. The scraping logic is located within the `scrapePropertyData` function.

### API Integration

1.  **Replace the placeholder price calculation:** Remove the `listingPrice * 0.95` calculation and replace it with a call to the new price estimation API.
2.  **Handle API request and response:** You will need to implement the logic to make the API request and handle the response.
3.  **Update the UI:** Update the `bestimate.innerHTML` with the price returned by the new API.

### Background Communication

The `content.js` file communicates with `background.js` using `chrome.runtime.sendMessage`. If the new API requires any configuration (e.g., API key), you might need to update `background.js` to store and manage this configuration. The `background.js` currently stores a Gemini API key, so you can use that as an example.

Good luck!
