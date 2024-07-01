const TOP_MENU_CLASS = '._ajv2._ajv1';

window.onload = () => {

    function waitForElementToExist(selector) {

        const btnObserver = new MutationObserver(() => {

            if (document.querySelector(selector)) {
          
                AddButton(document.querySelector(selector));

                btnObserver.disconnect();
            }
          });
      
          btnObserver.observe(document.body, {
            subtree: true,
            childList: true,
          });

        }
      
      waitForElementToExist(TOP_MENU_CLASS);

};


