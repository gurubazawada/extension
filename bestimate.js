async function getBestimate(propertyData) {
    console.log("INSIDE GETBESTIMATE FUNCTION");
    try {
      const address = propertyData.address;
      const regex = /([\d\w\s.#\-]+),\s*([\w\s]+),\s*([A-Z]{2})\s+(\d{5})/;
      const match = address.match(regex);
      if (!match) {
        throw new Error('Failed to parse address');
      }
      else {
        const [_, street, city, state, zip] = match;
  
        console.log("Street:", street);
        console.log("City:", city);
        console.log("State:", state);
        console.log("ZIP:", zip);
      }
  
      const encodedStreet = encodeURIComponent(street);
      const encodedCity = encodeURIComponent(city);
      const nextplaceRes = await fetch(
        `https://dev-nextplaceportal-api.azurewebsites.net/Properties/Search?&accountKey=DormBuilders&AddressFilter=${encodedStreet}&CityFilter=${encodedCity}&StateFilter=${state}&ZipCodeFilter=${zip}&ItemsPerPage=1`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
      
      if (!nextplaceRes.ok) {
        throw new Error('Failed to fetch property data from Nextplace');
      }
    
      const nextplaceData = await nextplaceRes.json();
      if (nextplaceData.length === 0) {
        throw new Error('No property data found');
      }
      const property = nextplaceData[0];
      const bestimatePrice = property.averageSalePrice;
      return bestimatePrice
  
    } catch (error) {
      console.error('Error fetching property data:', error);
      return null;
    }
    
  }