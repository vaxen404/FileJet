<template>
    <div class="items-grid"><slot /></div>
</template>

<style scoped>
.items-grid {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 0.75rem;
}

@media (max-width: 1500px) {
    .items-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }
}

@media (max-width: 1100px) {
    .items-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

@media (max-width: 800px) {
    .items-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 500px) {
    .items-grid {
        grid-template-columns: minmax(0, 1fr);
    }
}
</style>
