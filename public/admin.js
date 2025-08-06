document.addEventListener('DOMContentLoaded', () => {
  const productTableBody = document.getElementById('productTableBody');
  const form = document.getElementById('addProductForm');
  const productMap = {};

  function loadProducts() {
    fetch('/api/products')
      .then(res => res.json())
      .then(products => {
        productTableBody.innerHTML = '';
        products.forEach(product => {
          productMap[product.id] = product;

          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>$${product.price}</td>
            <td>
              <button class="edit" data-id="${product.id}">Edit</button>
              <button class="danger" data-id="${product.id}">Delete</button>
            </td>
          `;
          productTableBody.appendChild(row);
        });
      })
      .catch(err => console.error('Error loading products:', err));
  }

  loadProducts();

  productTableBody.addEventListener('click', (e) => {
    const id = e.target.dataset.id;
    if (!id) return;

    const product = productMap[id];

    if (e.target.classList.contains('edit')) {
      if (product) editProduct(product);
    }

    if (e.target.classList.contains('danger')) {
      deleteProduct(id);
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData();
    const coverImageFile = document.getElementById('coverImage').files[0];
    const hoverImageFile = document.getElementById('hoverImage').files[0];
    const galleryFiles = document.getElementById('images').files;

    if (coverImageFile) formData.append('coverImage', coverImageFile);
    if (hoverImageFile) formData.append('hoverImage', hoverImageFile);
    for (const file of galleryFiles) {
      formData.append('images', file);
    }

    // Step 1: Upload files
    let uploadPaths = {};
    if (formData.has('coverImage') || formData.has('hoverImage') || formData.has('images')) {
      try {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        uploadPaths = await uploadRes.json();
      } catch (err) {
        return console.error('❌ Upload failed:', err);
      }
    }

    // Step 2: Construct product data
    const data = {
      id: form.dataset.editingId || crypto.randomUUID(),
      order: form.dataset.editingOrder ? Number(form.dataset.editingOrder) : Date.now(),
      active: true,
      name: form.name.value,
      title: form.title.value,
      category: form.category.value,
      coverImage: uploadPaths.coverImage || form.coverImage.value,
      hoverImage: uploadPaths.hoverImage || form.hoverImage.value,
      images: uploadPaths.images || form.images.value.split(',').map(img => img.trim()),
      description: form.description.value,
      price: form.price.value,
      link: form.link.value
    };

    const method = form.dataset.editingId ? 'PUT' : 'POST';
    const url = form.dataset.editingId ? `/api/products/${data.id}` : '/api/products';

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(res => res.json())
      .then(() => {
        form.reset();
        form.querySelector('button[type="submit"]').textContent = 'Add Product';
        delete form.dataset.editingId;
        delete form.dataset.editingOrder;
        loadProducts();
      })
      .catch(err => console.error(`Error ${method === 'POST' ? 'adding' : 'updating'} product:`, err));
  });

  function editProduct(product) {
    form.name.value = product.name;
    form.title.value = product.title;
    form.category.value = product.category;
    form.coverImage.value = product.coverImage;
    form.hoverImage.value = product.hoverImage;
    form.images.value = product.images.join(', ');
    form.description.value = product.description;
    form.price.value = product.price;
    form.link.value = product.link;

    form.dataset.editingId = product.id;
    form.dataset.editingOrder = product.order;

    form.querySelector('button[type="submit"]').textContent = 'Update Product';
  }

  function deleteProduct(id) {
    fetch(`/api/products/${id}`, {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(() => {
        loadProducts();
      })
      .catch(err => console.error('Error deleting product:', err));
  }
});
