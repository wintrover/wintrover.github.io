<script>
  export let size = '40px';
  export let color = '#007acc';
</script>

<div class="spinner-container">
  <div class="spinner" style="width: {size}; height: {size}; border-color: {color} transparent {color} transparent;"></div>
  <p>포트폴리오를 불러오는 중...</p>
</div>

<style>
  .spinner-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: 1rem;
  }

  .spinner {
    border: 4px solid;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .spinner-container p {
    color: #666;
    font-size: 1.1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>