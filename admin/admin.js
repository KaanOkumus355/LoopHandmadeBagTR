document.addEventListener('DOMContentLoaded', () => {
  const productTableBody = document.getElementById('productTableBody');
  const form = document.getElementById('addProductForm');
  const productMap = {};

  function loadProducts() {
    fetch('/api/admin/products')
      .then(res => res.json())
      .then(products => {
        productTableBody.innerHTML = '';
        products.forEach(product => {
          productMap[product.id] = product;

          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>${product.price}</td>
            <td>${product.active ? '✅' : '❌'}</td>
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

    const data = {
      id: form.dataset.editingId || crypto.randomUUID(),
      order: Number(document.getElementById('order').value) || Date.now(),
      active: document.getElementById('active').checked,
      name: form.name.value,
      title: form.title.value,
      category: form.category.value,
      coverImage: uploadPaths.coverImage !== null && uploadPaths.coverImage !== undefined
        ? uploadPaths.coverImage
        : form.dataset.coverImage,
      hoverImage: uploadPaths.hoverImage !== null && uploadPaths.hoverImage !== undefined
        ? uploadPaths.hoverImage
        : form.dataset.hoverImage,
      images: uploadPaths.images && uploadPaths.images.length > 0
        ? uploadPaths.images
        : JSON.parse(form.dataset.images || '[]'),
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
      const previews = document.getElementById('editPreviews');
      if (previews) previews.remove();
      form.querySelector('button[type="submit"]').textContent = 'Add Product';
      delete form.dataset.editingId;
      delete form.dataset.editingOrder;
      loadProducts();
    });
  });

  function editProduct(product) {
    const oldPreview = document.getElementById('editPreviews');
    if (oldPreview) oldPreview.remove();

    form.insertAdjacentHTML('beforebegin', `
      <div id="editPreviews">
        <p><strong>Current Cover Image:</strong><br><img src="${product.coverImage}" height="100"></p>
        <p><strong>Current Hover Image:</strong><br><img src="${product.hoverImage}" height="100"></p>
        <p><strong>Current Gallery Images:</strong><br>
          ${product.images.map(img => `<img src="${img}" height="80" style="margin: 4px;">`).join('')}
        </p>
      </div>
    `);
    
    form.name.value = product.name;
    form.title.value = product.title;
    form.category.value = product.category;
    form.description.value = product.description;
    form.price.value = product.price;
    form.link.value = product.link;
    
    form.dataset.coverImage = product.coverImage;
    form.dataset.hoverImage = product.hoverImage;
    form.dataset.images = JSON.stringify(product.images);

    form.description.value = product.description;
    document.getElementById('order').value = product.order;
    document.getElementById('active').checked = !!product.active;
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
