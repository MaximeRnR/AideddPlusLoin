function downloadJSONChar() {
   const name = document.querySelector('#Output h4').innerHTML;

   let resumeElements = document.querySelectorAll('#currentPerso p');
   let raceClassLevel = resumeElements[1].innerHTML.split('<br>');
   const race = raceClassLevel[0];
   let gameClassElements = raceClassLevel[1].split(' ');
   const gameClasse = {label: gameClassElements[0], level: gameClassElements[gameClassElements.length - 1]};

   const stats = [...document.querySelectorAll('#currentPerso > p:nth-child(4) strong')].map(x => x.nextSibling.textContent.trim().split(' ')[0]);
   const charStats = {
      strength: parseInt(stats[0]),
      dexterity: parseInt(stats[1]),
      constitution: parseInt(stats[2]),
      intelligence: parseInt(stats[3]),
      wisdom: parseInt(stats[4]),
      charisma: parseInt(stats[5])
   };

   const pv = parseInt(resumeElements[7].textContent.split(' ')[1]);

   const abilitiesProficiencies = resumeElements[4].textContent.split(' ').map(skill => {
      return {proficiencyLevel: {label: 'proficient'}, ability: {label: skill.split(',')[0]}}
   });

   const enumStat = [
      {shortLabel: 'For', longLabel: 'Force', value: 'strength'},
      {shortLabel: 'Dex', longLabel: 'Dexterité', value: 'dexterity'},
      {shortLabel: 'Sag', longLabel: 'Sagesse', value: 'wisdom'},
      {shortLabel: 'Cha', longLabel: 'Charisme', value: 'charisma'},
      {shortLabel: 'Int', longLabel: 'Intelligence', value: 'intelligence'},
      {shortLabel: 'Con', longLabel: 'Constitution', value: 'constitution'}
   ];
   const savingThrowsProfiency = [];
   const strongElement = [...document.querySelectorAll('strong')];
   strongElement.filter(x => x.textContent === 'Sauvegardes')[0].nextSibling.textContent.split(' ')
      .forEach(x => {
         var indexOf = enumStat.map(y => y.shortLabel).indexOf(x);
         if (indexOf !== -1) {
            savingThrowsProfiency.push({label: enumStat[indexOf].value});
         }
      });

   const inventory = [...document.querySelectorAll('h5')].filter(x => x.textContent.includes('ÉQUIPEMENT'))[0].nextSibling.textContent;

   const hitDicesElement = strongElement.filter(x => x.textContent === 'DV')[0].nextSibling.textContent.split('d');
   const hitDices = {
      current: parseInt(hitDicesElement[0]),
      max: parseInt(hitDicesElement[0]),
      diceType: parseInt(hitDicesElement[1])
   };

   const spellStats = enumStat.filter(stat => stat.longLabel === strongElement.filter(x => x.textContent.includes('incantation'))[0]?.nextSibling.textContent.split(';')[0].trim())[0]?.value ?? 'strength';

   const spellToPrepare = parseInt(strongElement.filter(x => x.textContent === 'Sorts à préparer chaque jour')[0]?.nextSibling.textContent.split(';')[0]?.trim());

   const spellSlots = strongElement.filter(x => x.textContent === 'Emplacements')[0]?.nextSibling.textContent.trim().split('/')
      .map((slot, index) => {
      return {level: index+1, available: slot, max: slot};
   });

   let firstFeature = [...document.querySelectorAll('h5')].filter(x => x.textContent.includes('CAPACITÉS'))[0].nextSibling;
   let features = [];
   while(!firstFeature.nextSibling.textContent.includes('ÉQUIPEMENT')){
      features.push(firstFeature.textContent);
      firstFeature = firstFeature.nextSibling;
   }
   features.push(firstFeature.textContent);
   features = features.join(',').split(',,').map(x => x.split(',').join('')).map(feature => {
      const miniDescriptionPlusChargePlusCooldown = feature.split('(')[1];
      const miniDesc = miniDescriptionPlusChargePlusCooldown?.replace(')', '') ?? '';
      let chargeAndRest = miniDescriptionPlusChargePlusCooldown?.split('/') ?? [];
      const coolDown = chargeAndRest[1]?.includes('repos') ? (chargeAndRest[1]?.replace(')', '').includes('repos court') ? 'shortRest' : 'longRest') : '';
      const charges = chargeAndRest.length > 0 ? (!isNaN(parseInt(chargeAndRest[0][(chargeAndRest[0].length - 1)])) ? parseInt(chargeAndRest[0][(chargeAndRest[0].length - 1)]) : 0 ): 0;
      return {name: feature.split('(')[0], miniDescription: miniDesc, description: '', maxCharge: charges, currentCharge: charges, cooldown: {label: coolDown}, costInCombat: '', usable: !!charges };
   })


   const speed = strongElement.filter(x => x.textContent === 'Vitesse')[0].nextSibling.textContent.trim()
   const character = JSON.stringify({
      name: name,
      race: race,
      gameClasses: [gameClasse],
      stats: charStats,
      healthPoints: {current: pv, max: pv, temporary: 0},
      abilitiesProficiencies: abilitiesProficiencies,
      savingThrowsProficiencies: savingThrowsProfiency,
      inventory: inventory,
      hitDices: hitDices,
      spellStat: {label: spellStats},
      spellToPrepare: spellToPrepare,
      spellSlots: spellSlots,
      speed: speed,
      features: features
   });

   var element = document.createElement('a');
   element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(character));
   element.setAttribute('download', name + '.json');

   element.style.display = 'none';
   document.body.appendChild(element);

   element.click();

   document.body.removeChild(element);
}

let listenersInitialized = false;

function areListenersInitialized() {
   return listenersInitialized;
}

function handleUpdated(tabId, changeInfo, tabInfo) {
   if (changeInfo?.url?.includes("ddplusloin")) {
      listenersInitialized = false;
      chrome.tabs.query({url: "*://ddplusloin.herokuapp.com/*"}, function (tabs) {
         for (const tab of tabs) {
            chrome.scripting.executeScript({
               target: {tabId: tab.id}, function: removePopup
            });
         }
      });
   }
}

// Handles Messages from popup.js and DDPlusLoin content-script.
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
   if (request.msg === "initListeners") {
      listenersInitialized = true;
      chrome.tabs.query({url: "*://www.aidedd.org/*"}, function (tabs) {
         for (const tab of tabs) {
            chrome.scripting.executeScript({
               target: {tabId: tab.id}, function: downloadJSONChar,
            });
         }
      });
      sendResponse({listenersInitialized: areListenersInitialized()});
      return;
   }
});

// Message From DDPLUSLOIN checking if extension is install and activated.
chrome.runtime.onMessageExternal.addListener(function (request, sender, sendResponse) {
   sendResponse({listenersInitialized: areListenersInitialized()});
});

// If DDPLUSLOIN tab is updated then remove popup and reset listenerInitialized.
chrome.tabs.onUpdated.addListener(handleUpdated);

