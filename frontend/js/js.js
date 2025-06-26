function EnviarDatos(){
    var name = document.getElementById("name").value;
    var email = document.getElementById("email").value;
    var phone = document.getElementById("phone").value;
    var message = document.getElementById("message").value;
    var cont=0;
    if(name==""){
        cont++;
    }
    if(email==""){
        cont++
    }
    if(phone==""){
        cont++;
    }
    if(message==""){
        cont++;
    }
    if(cont!=0){
        alert("Debe llenar todos los datos del formulario para enviarlo")
    }
    
}
window.addEventListener('DOMContentLoaded', event => {

    // Navbar shrink function
    var navbarShrink = function () {
        const navbarCollapsible = document.body.querySelector('#mainNav');
        if (!navbarCollapsible) {
            return;
        }
        if (window.scrollY === 0) {
            navbarCollapsible.classList.remove('navbar-shrink')
        } else {
            navbarCollapsible.classList.add('navbar-shrink')
        }

    };

    // Shrink the navbar 
    navbarShrink();

    // Shrink the navbar when page is scrolled
    document.addEventListener('scroll', navbarShrink);

    //  Activate Bootstrap scrollspy on the main nav element
    const mainNav = document.body.querySelector('#mainNav');
    if (mainNav) {
        new bootstrap.ScrollSpy(document.body, {
            target: '#mainNav',
            rootMargin: '0px 0px -40%',
        });
    };

    // Collapse responsive navbar when toggler is visible
    const navbarToggler = document.body.querySelector('.navbar-toggler');
    const responsiveNavItems = [].slice.call(
        document.querySelectorAll('#navbarResponsive .nav-link')
    );
    responsiveNavItems.map(function (responsiveNavItem) {
        responsiveNavItem.addEventListener('click', () => {
            if (window.getComputedStyle(navbarToggler).display !== 'none') {
                navbarToggler.click();
            }
        });
    });

});

function initMap() {
    const mendoza = { lat: -32.8892, lng: -68.8458 };
    const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 12,
    center: mendoza,
    });
    const locations = [
      { lat: -32.8792397, lng: -68.8572598, title: "ATAL Autoservicio (Sucursal Ciudad)" },
      { lat: -32.901485, lng: -68.8776196, title: "ATAL Autoservicio" },
      { lat: -32.9200056, lng: -68.8179595, title: "ATAL Autoservicio (Sucursal Guaymallén)" }
      ];
  
    locations.forEach(location => {
      new google.maps.Marker({
        position: { lat: location.lat, lng: location.lng },
        map: map,
        title: location.title,
        });
      });
  }