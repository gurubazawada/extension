(function() {
  // Create inline Bestimate display
  function createInlineBestimate(propertyData) {
    if (document.querySelector('.bestimate-inline')) return;

    // Try both price selectors
    const priceElement = document.querySelector('[data-testid="price"], .price-text');
    if (!priceElement) {
      setTimeout(() => createInlineBestimate(propertyData), 1000);
      return;
    }

    const listingPrice = parseInt(propertyData.listingPrice.replace(/[^0-9]/g, ''));
    const bestimatePriceFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(listingPrice * 0.95);

    const bestimate = document.createElement('span');
    bestimate.className = 'bestimate-inline';
    bestimate.innerHTML = `
      <span>Bestimate: ${bestimatePriceFormatted}</span>
      <style>
        .bestimate-inline {
          font-size: 13px !important;
          display: inline-block;
          margin-left: 12px;
          padding: 4px 12px;
          background: #e8f0fe;
          color: #1a73e8;
          border-radius: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s, transform 0.2s;
          vertical-align: middle;
          box-shadow: 0 1px 3px rgba(60, 64, 67, 0.15);
        }
        .bestimate-inline:hover {
          background: #d2e3fc;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(60, 64, 67, 0.2);
        }
      </style>
    `;

    bestimate.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
    });

    // Insert after price
    priceElement.parentNode.insertBefore(bestimate, priceElement.nextSibling);
  }

  // Function to scrape property data
  function scrapePropertyData() {
    // Find the price element (try both selectors)
    const priceElement = document.querySelector('[data-testid="price"], .price-text');
    const listingPrice = priceElement?.innerText || 'Price not found';

    // Find the address element - any h1 containing a comma (address format)
    const addressElement = document.querySelector('h1:not(.bestimate-inline)');
    const address = addressElement?.innerText || 'Address not found';

    // Find all bed/bath/sqft containers and their values
    const factContainers = document.querySelectorAll('[data-testid="bed-bath-sqft-text__container"]');
    let beds = '0', baths = '0', sqft = '0';

    // Iterate through containers to find values based on their description
    factContainers.forEach(container => {
      const value = container.querySelector('[data-testid="bed-bath-sqft-text__value"]')?.innerText || '';
      const description = container.querySelector('[data-testid="bed-bath-sqft-text__description"]')?.innerText?.toLowerCase() || '';
      
      if (description.includes('bed')) {
        beds = value;
      } else if (description.includes('bath')) {
        baths = value;
      } else if (description.includes('sqft')) {
        sqft = value;
      }
    });

    // Get property description
    const descriptionElement = document.querySelector('[data-testid="property-description"]');
    const description = descriptionElement?.innerText || '';

    // Find days on market from stats section
    let daysOnMarket = 'N/A';
    const dlElements = document.querySelectorAll('dl');
    for (const dl of dlElements) {
      if (dl.textContent.includes('on Zillow')) {
        const daysText = dl.querySelector('dt strong')?.textContent;
        if (daysText) {
          daysOnMarket = daysText.replace(/\D/g, ''); // Extract just the number
          break;
        }
      }
    }

    const propertyData = {
      address,
      listingPrice,
      sqft,
      beds,
      baths,
      description,
      url: window.location.href,
      daysOnMarket,
      scrapedAt: new Date().toISOString()
    };

    // Send data to background script and create UI
    chrome.runtime.sendMessage({ type: 'PROPERTY_DATA', data: propertyData });
    createInlineBestimate(propertyData);
  }

  // Function to handle DOM changes
  function handleDOMChanges() {
    console.log("Setting up DOM observer...");

    // Initial check for property page
    if (window.location.href.includes('/homes/') || 
        window.location.href.includes('/homedetails/')) {
      scrapePropertyData();
    }

    const observer = new MutationObserver(() => {
      if (window.location.href.includes('/homes/') || 
          window.location.href.includes('/homedetails/')) {
        console.log("On property page, checking for price...");
        scrapePropertyData();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });
  }
  
  // Initial load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleDOMChanges);
  } else {
    handleDOMChanges();
  }
})();