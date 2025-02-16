// Mapping primary fighting country (side name) to colors
const sideColors = {
  "Ukraine": "#1E90FF", // DodgerBlue
  "Russia": "#FF4500", // OrangeRed
  "Syrian Government": "#228B22", // ForestGreen
  "Rebel Groups": "#FFA500", // Orange
  "Hadi Government": "#4169E1", // RoyalBlue
  "Houthi Rebels": "#B22222", // FireBrick
  "Government of National Unity (GNU)": "#800080", // Purple
  "Libyan National Army (LNA)": "#8B4513" // SaddleBrown
};

document.addEventListener("DOMContentLoaded", () => {
  // Fetch the wars data from the JSON file
  fetch('wars.json')
    .then(response => response.json())
    .then(data => {
      const wars = data.wars;
      const warSelector = document.getElementById('war-selector');

      // Populate the dropdown with available wars
      wars.forEach(war => {
        const option = document.createElement('option');
        option.value = war.id;
        option.textContent = war.name;
        warSelector.appendChild(option);
      });

      // Listen for when a war is selected from the dropdown
      warSelector.addEventListener('change', function() {
        const selectedId = parseInt(this.value);
        const selectedWar = wars.find(war => war.id === selectedId);
        if (selectedWar) {
          displayWarDetails(selectedWar);
        }
      });
    })
    .catch(error => console.error('Error fetching wars.json:', error));
});

function displayWarDetails(war) {
  // Create or clear the container that displays war details
  let detailsContainer = document.getElementById('war-details');
  if (!detailsContainer) {
    detailsContainer = document.createElement('div');
    detailsContainer.id = 'war-details';
    // Append the details container below the map graphic
    document.querySelector('main').appendChild(detailsContainer);
  } else {
    detailsContainer.innerHTML = ''; // Clear any existing content
  }

  // Display war name and description
  const warTitle = document.createElement('h2');
  warTitle.textContent = war.name;
  detailsContainer.appendChild(warTitle);

  const warDescription = document.createElement('p');
  warDescription.textContent = war.description;
  detailsContainer.appendChild(warDescription);

  // Loop through each side (combatant) and display details along with supporters
  war.sides.forEach(side => {
    const sideDiv = document.createElement('div');
    sideDiv.classList.add('side');
    // Apply a colored border based on the side's primary fighting country
    sideDiv.style.border = `2px solid ${sideColors[side.name] || '#000'}`;
    sideDiv.style.margin = '10px 0';
    sideDiv.style.padding = '10px';

    const sideTitle = document.createElement('h3');
    sideTitle.textContent = side.name;
    sideDiv.appendChild(sideTitle);

    const sideDesc = document.createElement('p');
    sideDesc.textContent = side.description;
    sideDiv.appendChild(sideDesc);

    // If there are any supporters, list them
    if (side.supporters && side.supporters.length > 0) {
      const supportersTitle = document.createElement('h4');
      supportersTitle.textContent = "Supporters:";
      sideDiv.appendChild(supportersTitle);

      const supporterList = document.createElement('ul');
      side.supporters.forEach(supporter => {
        const li = document.createElement('li');
        li.textContent = `${supporter.name} (${supporter.type})`;
        supporterList.appendChild(li);
      });
      sideDiv.appendChild(supporterList);
    }

    detailsContainer.appendChild(sideDiv);
  });
}
