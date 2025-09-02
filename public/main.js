        function filterBags(category) {
            const cards = document.querySelectorAll('.bag-card');
            cards.forEach(card => {
             const cardCategory = card.getAttribute('data-category');
            if (category === 'all' || cardCategory === category) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
            });
            const buttons = document.querySelectorAll('.filter-buttons button');
            buttons.forEach(btn => btn.classList.remove('active'));
            document.querySelector(`[onclick="filterBags('${category}')"]`).classList.add('active');
        }

        $(document).ready(function(){
            $("#myInput").on("keyup", function() {
                var value = $(this).val().toLowerCase();
                $(".bag-card").filter(function() {
                    $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
                });
            });
        });

        let currentImageIndex = 0;
        let currentImages = [];
        let currentModalId = '';

        function preloadImages(images) {
            images.forEach(src => {
                const img = new Image();
                img.src = src;
            });
        }

        function openModal(id) {
            const modal = document.getElementById(id);
            const images = JSON.parse(modal.getAttribute('data-images'));

            currentImageIndex = 0;
            currentImages = images;
            currentModalId = id;

            preloadImages(images);

            updateModalImage();
            modal.classList.add('active');

        }

        function updateModalImage() {
            const modal = document.getElementById(currentModalId);
            const imgTag = modal.querySelector('#modal-image');
            const infoTag = modal.querySelector('.info');
            imgTag.src = currentImages[currentImageIndex];
            infoTag.textContent = `${currentImageIndex + 1}/${currentImages.length}`;
        }


        function nextImage() {
            currentImageIndex = (currentImageIndex + 1) % currentImages.length;
            updateModalImage();
        }

        function prevImage () {
             currentImageIndex = (currentImageIndex - 1 + currentImages.length) % currentImages.length;
            updateModalImage();
        }

        function closeModal(id) {
            document.getElementById(id).classList.remove('active');
        }

        document.addEventListener('click', function (e) {
            document.querySelectorAll('.product-modal.active').forEach(modal => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });

        const gallery = document.getElementById('bagGallery')
        const modals = document.getElementById('modalsContainer')
        
        fetch('/api/products')
            .then(response => response.json())
            .then(products =>{
                products.sort((a, b) => a.order - b.order);

                products.forEach(product => {
                    if(!product.active) return;

                    const cardHTML = `
                        <div class="bag-card" data-category="${product.category}" onclick="openModal('${product.id}')">
                            <div class="image-hover-wrapper">
                                <img src="${product.coverImage}" alt="${product.name}" class="base-image">
                                <img src="${product.hoverImage}" alt="${product.name}" class="hover-image">
                            </div>
                            <p>${product.name}</p>
                            <p class="product-price-show">${product.price}</p>
                        </div>
                    `;
                    gallery.innerHTML += cardHTML;

                    const imagesArray = JSON.stringify(product.images);
                    const ModalHTML = `
                            <div class="product-modal" id="${product.id}" data-images='${imagesArray}'>
                                <div class="modal-content">
                                    <span class="close-btn" onclick="closeModal('${product.id}')">&times;</span>
                                    <div class="image-container">
                                        <button class="prev" id="prev" onclick="prevImage()">&#8592;</button>
                                        <img src="${product.images[0]}" alt="${product.name}" id="modal-image">
                                        <button class="next" id="next" onclick="nextImage()">&#8594;</button>
                                        <p class="info">1/${product.images.length}</p>
                                    </div>
                                    <p><strong>${product.title}</strong></p>
                                    <p>Description: ${product.description}</p>
                                    <p>Price: $${product.price}</p>
                                    <a class="buy-button" target="_blank" href="${product.link}">Purchase</a>
                                </div>
                            </div>
                        `;
                        modals.innerHTML += ModalHTML;
                });
            })
            .catch(error => console.error('Error loading products:', error));
        