const TOP_MENU_CLASS = '.x1c4vz4f .xs83m0k .xdl72j9 .x1g77sc7';

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


