import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import * as THREE from 'three';
// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ProductService, Product } from '../services/product.service';
import { CartService } from '../services/cart.service';
import { CategoryService, Category } from '../services/category.service';
import Swal from 'sweetalert2';
import { NotificationComponent } from '../shared/notification/notification.component';
import { ToastComponent } from '../shared/toast/toast.component';
import { ToastService } from '../services/toast.service';

gsap.registerPlugin(ScrollTrigger);
@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule, NotificationComponent, ToastComponent],
    templateUrl: './landing.component.html',
    styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {

    ischeck() {
        const role = localStorage.getItem('role');
        if (role === 'admin') {
            this.router.navigate(['/admin']);
        }
        else if (role === 'vendor') {
            this.router.navigate(['/vendor']);
        }
        else if (role === 'deliveryPartner') {
            this.router.navigate(['/delivery-partner']);
        }
        this.router.navigate(['/']);
    }
    isLoggedIn(): boolean {
        return !!localStorage.getItem('token');  // returns true or false
    }

    getUserName(): string {
        return localStorage.getItem('name') || '';
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('token');
        window.location.reload();
    }

    @ViewChild('canvasContainer', { static: true }) canvasContainer!: ElementRef<HTMLDivElement>;

    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private foodObject!: THREE.Group;
    private animationFrameId!: number;


    popularProducts: Product[] = [];
    products: Product[] = [];
    originalProducts: Product[] = [];
    categories: Category[] = [];
    searchQuery: string = '';

    constructor(
        @Inject(PLATFORM_ID) private platformId: Object,
        private router: Router,
        private productService: ProductService,
        private cartService: CartService,
        private categoryService: CategoryService,
        private http: HttpClient,
        private toastService: ToastService
    ) { }

    ngOnInit(): void {
        this.fetchProducts();
        this.fetchCategories();
    }

    fetchCategories() {
        this.categoryService.getAllCategories().subscribe({
            next: (data) => {
                this.categories = data;
                console.log('Categories loaded:', this.categories);
                this.updateCategoryRealCounts();
            },
            error: (err) => {
                console.error('Error loading categories:', err);
            }
        });
    }

    addToCart(product: any, replaceCart: boolean = false) {
        if (!this.isLoggedIn()) {
            Swal.fire('Please Login', 'You need to be logged in to add items to cart', 'info');
            this.router.navigate(['/login']);
            return;
        }

        if (!product._id || !product.vendor_id) {
            console.error('Missing product ID or vendor ID', product);
            return;
        }

        const vendorId = typeof product.vendor_id === 'object' ? product.vendor_id._id : product.vendor_id;

        // Add to cart directly - kitchen status will be checked at checkout
        this.cartService.addToCart(product._id!, vendorId, 1, replaceCart).subscribe({
            next: (res) => {
                this.toastService.show('Added to cart');
            },
            error: (err) => {
                if (err.status === 409) { // Vendor conflict
                    Swal.fire({
                        title: 'Different Vendor',
                        text: "Your cart contains items from a different vendor. Replace cart with this new item?",
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#ff4e50',
                        cancelButtonColor: '#aaa',
                        confirmButtonText: 'Yes, replace it!'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            this.addToCart(product, true); // Retry with replaceCart = true
                        }
                    });
                } else {
                    console.error('Error adding to cart:', err);
                    this.toastService.show('Could not add to cart', 'error');
                }
            }
        });
    }

    fetchProducts() {
        this.productService.getAllProducts().subscribe({
            next: (data) => {
                this.products = data;
                this.originalProducts = [...data];

                // Get 8 random products for Popular section
                this.popularProducts = this.getRandomProducts(data, 8);

                this.updateCategoryRealCounts();
            },
            error: (err) => {
                console.error('Error loading products:', err);
            }
        });
    }

    getRandomProducts(products: Product[], count: number): Product[] {
        // Create a copy to avoid modifying original array
        const shuffled = [...products].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, count);

        // Add random ratings
        selected.forEach(p => {
            // Random rating between 4.2 and 5.0
            (p as any).rating = (4.2 + Math.random() * 0.8).toFixed(1);
        });

        return selected;
    }

    onSearch() {
        const query = this.searchQuery.trim().toLowerCase();

        if (!query) {
            this.products = [...this.originalProducts];
        } else {
            this.products = this.originalProducts.filter(p =>
                p.name.toLowerCase().includes(query) ||
                ((p as any).category && String((p as any).category).toLowerCase().includes(query)) ||
                (p.description && p.description.toLowerCase().includes(query))
            );
        }

        // Scroll to the products section to show results
        setTimeout(() => {
            const element = document.getElementById('section-3');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    }

    private updateCategoryRealCounts() {
        // Always keep all category cards visible.
        // Just update a numeric realCount based on products; if none, show 0 items.
        if (!this.categories || this.categories.length === 0 || !this.products) {
            return;
        }

        const normalize = (v: any) => String(v || '').trim().toLowerCase();

        const countsByCategoryId = new Map<string, number>();
        const countsByCategoryName = new Map<string, number>();

        for (const p of this.products) {
            const catIds: string[] = Array.isArray((p as any).category_id)
                ? ((p as any).category_id as any[]).map(String)
                : ((p as any).category_id ? String((p as any).category_id).split(',') : []);

            for (const id of catIds) {
                const key = String(id);
                countsByCategoryId.set(key, (countsByCategoryId.get(key) || 0) + 1);
            }

            const catName = normalize((p as any).category);
            if (catName) {
                countsByCategoryName.set(catName, (countsByCategoryName.get(catName) || 0) + 1);
            }
        }

        this.categories = this.categories.map((c) => {
            const byId = c._id ? (countsByCategoryId.get(String(c._id)) || 0) : 0;
            const byName = countsByCategoryName.get(normalize(c.name)) || 0;
            const realCount = byId || byName || 0;
            return { ...c, realCount };
        });
    }

    getImageUrl(imagePath: string): string {
        if (!imagePath) return 'assets/placeholder-food.jpg';
        if (imagePath.startsWith('http')) return imagePath;

        // Normalize slashes
        let cleanPath = imagePath.replace(/\\/g, '/');

        // Remove leading slash if present
        if (cleanPath.startsWith('/')) {
            cleanPath = cleanPath.substring(1);
        }

        // Fix potential path issues (e.g., if DB says 'products/' but file is in 'uploads/')
        if (cleanPath.includes('products/')) {
            cleanPath = cleanPath.replace('products/', '');
        }

        // Ensure it starts with uploads/
        if (!cleanPath.startsWith('uploads/')) {
            cleanPath = `uploads/${cleanPath}`;
        }

        // Clean up any double uploads/ if they happened
        if (cleanPath.startsWith('uploads/uploads/')) {
            cleanPath = cleanPath.substring(8);
        }

        return `https://speak2-eatbackend.vercel.app/${cleanPath}`;
    }

    ngAfterViewInit(): void {
        if (isPlatformBrowser(this.platformId)) {
            this.initThree();
            this.initScrollAnimations();
            window.addEventListener('resize', this.onWindowResize.bind(this));
        }
    }

    ngOnDestroy(): void {
        if (isPlatformBrowser(this.platformId)) {
            window.removeEventListener('resize', this.onWindowResize.bind(this));
            if (this.renderer) {
                this.renderer.dispose();
            }
            ScrollTrigger.getAll().forEach(t => t.kill());
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    private initThree(): void {
        const container = this.canvasContainer.nativeElement;

        // Scene
        this.scene = new THREE.Scene();
        // Transparent background to let CSS gradient show through
        this.scene.background = null;

        // Camera - Better positioning for prominent view
        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(2, 1, 10); // Closer and slightly angled

        // Renderer - Enhanced settings
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Optimize performance
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 2.0; // Even brighter
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        // --- ENHANCED LIGHTING SETUP ---

        // 1. Ambient Light - Overall brightness
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // 2. Hemisphere Light (Sky + Ground bounce)
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffaa00, 1.2);
        hemiLight.position.set(0, 20, 0);
        this.scene.add(hemiLight);

        // 3. Main Key Light (Directional)
        const dirLight = new THREE.DirectionalLight(0xffffff, 3.0);
        dirLight.position.set(8, 12, 8);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.bias = -0.0001;
        this.scene.add(dirLight);

        // 4. Front Fill Light
        const fillLight = new THREE.DirectionalLight(0xffeedd, 1.5);
        fillLight.position.set(-6, 2, 10);
        this.scene.add(fillLight);

        // 5. Rim/Back Light (Spotlight for drama)
        const rimLight = new THREE.SpotLight(0xff4e50, 5.0);
        rimLight.position.set(0, 12, -12);
        rimLight.angle = Math.PI / 6;
        rimLight.penumbra = 0.3;
        rimLight.lookAt(0, 0, 0);
        this.scene.add(rimLight);

        // 6. Accent Light from Left (Cyan/Blue tint)
        const accentLight1 = new THREE.PointLight(0x00ffff, 2.0, 20);
        accentLight1.position.set(-8, 3, 5);
        this.scene.add(accentLight1);

        // 7. Accent Light from Right (Orange tint)
        const accentLight2 = new THREE.PointLight(0xffa500, 2.0, 20);
        accentLight2.position.set(8, 3, 5);
        this.scene.add(accentLight2);

        // Food Object Container
        this.foodObject = new THREE.Group();
        // POSITION: More to the right and slightly elevated
        this.foodObject.position.set(4, 0.5, 0);
        this.scene.add(this.foodObject);

        // ---------------------------------------------------------
        // LOAD YOUR 3D MODEL HERE
        // ---------------------------------------------------------

        const loader = new GLTFLoader();
        const modelUrl = 'assets/burger.glb';

        loader.load(
            modelUrl,
            (gltf: any) => {
                console.log('Model loaded successfully!');
                const model = gltf.scene;

                // Enhanced material properties
                model.traverse((child: any) => {
                    if (child.isMesh && child.material) {
                        child.material.emissive = new THREE.Color(0x333333); // Brighter emissive
                        child.material.metalness = 0.2; // Slight metallic sheen
                        child.material.roughness = 0.6; // Not too shiny
                        child.material.needsUpdate = true;
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                // Auto-center
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());

                model.position.x += (model.position.x - center.x);
                model.position.y += (model.position.y - center.y);
                model.position.z += (model.position.z - center.z);

                const maxDim = Math.max(size.x, size.y, size.z);
                if (maxDim > 0) {
                    const scale = 7 / maxDim; // BIGGER - increased from 5 to 7
                    model.scale.set(scale, scale, scale);
                }

                this.foodObject.add(model);
            },
            (xhr: any) => { },
            (error: any) => {
                console.warn('Using Fallback Geometry');
                this.createFallbackGeometry();
            }
        );

        this.animate();
    }

    private createFallbackGeometry(): void {
        // --- ENHANCED PROCEDURAL BURGER (Highly Visible & Vibrant) ---

        // Shared Geometries
        const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 64);

        // 1. Bottom Bun - Bright Golden
        const bunMat = new THREE.MeshStandardMaterial({
            color: 0xFFD700, // Bright golden yellow
            roughness: 0.5,
            metalness: 0.1,
            emissive: 0xFFAA00,
            emissiveIntensity: 0.3
        });
        const bunBotGeo = new THREE.CylinderGeometry(1.5, 1.4, 0.6, 64);
        const bunBot = new THREE.Mesh(bunBotGeo, bunMat);
        bunBot.position.y = -0.8;
        bunBot.castShadow = true;
        bunBot.receiveShadow = true;
        this.foodObject.add(bunBot);

        // 2. Lettuce - Vibrant Green (Multiple layers)
        const lettuceGeo = new THREE.TorusGeometry(1.6, 0.12, 12, 100);
        const lettuceMat = new THREE.MeshStandardMaterial({
            color: 0x00FF00, // Bright green
            roughness: 0.3,
            emissive: 0x00AA00,
            emissiveIntensity: 0.4,
            side: THREE.DoubleSide
        });

        for (let i = 0; i < 4; i++) {
            const lettuce = new THREE.Mesh(lettuceGeo, lettuceMat);
            lettuce.rotation.x = Math.PI / 2;
            lettuce.position.y = -0.3 + (i * 0.06);
            lettuce.scale.set(1, 1, 1 + Math.random() * 0.6);
            lettuce.rotation.z = Math.random() * Math.PI;
            this.foodObject.add(lettuce);
        }

        // 3. Patty - Rich Brown with texture
        const pattyGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.6, 64);
        const posAttribute = pattyGeo.attributes['position'];
        for (let i = 0; i < posAttribute.count; i++) {
            const x = posAttribute.getX(i);
            const z = posAttribute.getZ(i);
            if (Math.abs(Math.sqrt(x * x + z * z) - 1.5) < 0.1) {
                const noise = (Math.random() - 0.5) * 0.12;
                posAttribute.setX(i, x + noise);
                posAttribute.setZ(i, z + noise);
            }
        }
        pattyGeo.computeVertexNormals();

        const pattyMat = new THREE.MeshStandardMaterial({
            color: 0x8B4513, // Rich brown
            roughness: 0.6,
            metalness: 0.2,
            emissive: 0x4A2511,
            emissiveIntensity: 0.3
        });
        const patty = new THREE.Mesh(pattyGeo, pattyMat);
        patty.position.y = 0.15;
        patty.castShadow = true;
        this.foodObject.add(patty);

        // 4. Melted Cheese - Bright Yellow
        const cheeseGeo = new THREE.BoxGeometry(2.6, 0.12, 2.6, 16, 2, 16);
        const cPos = cheeseGeo.attributes['position'];
        for (let i = 0; i < cPos.count; i++) {
            const x = cPos.getX(i);
            const y = cPos.getY(i);
            const z = cPos.getZ(i);
            const dist = Math.sqrt(x * x + z * z);
            if (Math.abs(x) > 1.0 || Math.abs(z) > 1.0) {
                const droop = Math.pow(Math.max(Math.abs(x), Math.abs(z)) - 0.8, 2) * 1.5;
                cPos.setY(i, y - droop);
                if (y < 0) {
                    const expansion = (y * -0.2);
                    cPos.setX(i, x * (1 + expansion));
                    cPos.setZ(i, z * (1 + expansion));
                }
            }
        }
        cheeseGeo.computeVertexNormals();

        const cheeseMat = new THREE.MeshStandardMaterial({
            color: 0xFFCC00, // Bright cheese yellow
            roughness: 0.2,
            metalness: 0.1,
            emissive: 0xFFAA00,
            emissiveIntensity: 0.4
        });
        const cheese = new THREE.Mesh(cheeseGeo, cheeseMat);
        cheese.position.y = 0.5;
        cheese.castShadow = true;
        this.foodObject.add(cheese);

        // 5. Tomatoes - Bright Red (Slices)
        const tomatoGeo = new THREE.CylinderGeometry(1.3, 1.3, 0.12, 32);
        const tomatoMat = new THREE.MeshPhysicalMaterial({
            color: 0xFF3333, // Bright red
            roughness: 0.2,
            transmission: 0.2,
            thickness: 0.5,
            emissive: 0xFF0000,
            emissiveIntensity: 0.2
        });

        const t1 = new THREE.Mesh(tomatoGeo, tomatoMat);
        t1.position.set(0.3, 0.7, 0.2);
        t1.rotation.z = 0.1;
        this.foodObject.add(t1);

        const t2 = new THREE.Mesh(tomatoGeo, tomatoMat);
        t2.position.set(-0.2, 0.75, -0.2);
        t2.rotation.x = -0.1;
        this.foodObject.add(t2);

        // 6. Top Bun - Bright Golden
        const bunTopGeo = new THREE.SphereGeometry(1.5, 64, 64, 0, Math.PI * 2, 0, Math.PI * 0.5);
        bunTopGeo.scale(1, 0.75, 1);

        const bunTop = new THREE.Mesh(bunTopGeo, bunMat);
        bunTop.position.y = 0.9;
        bunTop.castShadow = true;
        this.foodObject.add(bunTop);

        // 7. Sesame Seeds - Bright White/Cream
        const seedGeo = new THREE.ConeGeometry(0.025, 0.07, 6);
        const seedMat = new THREE.MeshStandardMaterial({
            color: 0xFFFFCC,
            emissive: 0xFFEEAA,
            emissiveIntensity: 0.3
        });

        for (let i = 0; i < 250; i++) {
            const seed = new THREE.Mesh(seedGeo, seedMat);
            const phi = Math.acos(Math.random() * 0.8 + 0.2);
            const theta = Math.random() * Math.PI * 2;
            const r = 1.35; // Radius of bun

            // Convert to Cartesian
            // Note: Our sphere is scaled Y by 0.7, so we need to adjust position logic
            const yRaw = r * Math.cos(phi);
            const x = r * Math.sin(phi) * Math.cos(theta);
            const z = r * Math.sin(phi) * Math.sin(theta);
            const y = yRaw * 0.7; // Apply scale

            seed.position.set(x, y, z);

            // Orient seed to face out
            // Look at slightly above center to angle them along surface
            const lookTarget = new THREE.Vector3(x * 2, y * 2 + 5, z * 2);
            seed.lookAt(lookTarget);

            bunTop.add(seed);
        }

        // 8. Floating Particles (Magic Spices)
        const particleGeo = new THREE.OctahedronGeometry(0.08, 0);
        for (let i = 0; i < 30; i++) {
            const pMat = new THREE.MeshBasicMaterial({
                color: Math.random() > 0.5 ? 0xffcc00 : 0xff5500
            });
            const p = new THREE.Mesh(particleGeo, pMat);

            const dist = 2.5 + Math.random() * 2;
            const angle = Math.random() * Math.PI * 2;
            const height = (Math.random() - 0.5) * 4;

            p.position.set(Math.cos(angle) * dist, height, Math.sin(angle) * dist);

            // Animate these in render loop ideally, but static placement for now
            this.foodObject.add(p);
        }
    }

    private animate(): void {
        this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

        // Enhanced floating and rotation animation
        const time = Date.now() * 0.001;

        // Smooth rotation - slightly faster
        this.foodObject.rotation.y += 0.008;

        // Floating motion - up and down
        this.foodObject.position.y = 0.5 + Math.sin(time) * 0.3;

        // Subtle tilt for more dynamic look
        this.foodObject.rotation.x = Math.sin(time * 0.5) * 0.05;
        this.foodObject.rotation.z = Math.cos(time * 0.7) * 0.03;

        this.renderer.render(this.scene, this.camera);
    }

    private initScrollAnimations(): void {
        // 1. Initial Scale Up (Entrance)
        gsap.from(this.foodObject.scale, {
            duration: 1.5,
            x: 0, y: 0, z: 0,
            ease: "elastic.out(1, 0.5)"
        });

        // 2. Scroll Trigger - Rotate and Move
        // As user scrolls down, the burger rotates frantically and moves to the side

        // Section 1 -> 2
        gsap.to(this.foodObject.rotation, {
            scrollTrigger: {
                trigger: "#section-2",
                start: "top bottom",
                end: "top top",
                scrub: 1
            },
            x: Math.PI * 2,
            z: Math.PI / 4
        });

        gsap.to(this.foodObject.position, {
            scrollTrigger: {
                trigger: "#section-2",
                start: "top bottom",
                end: "center center",
                scrub: 1
            },
            x: 3, // Move to right
            z: 1  // Come closer
        });

        // Section 2 -> 3 (Spin back and go left)
        gsap.to(this.foodObject.position, {
            scrollTrigger: {
                trigger: "#section-3",
                start: "top bottom",
                end: "center center",
                scrub: 1
            },
            x: -3,
            y: -1
        });

        gsap.to(this.foodObject.rotation, {
            scrollTrigger: {
                trigger: "#section-3",
                start: "top bottom",
                end: "center center",
                scrub: 1
            },
            y: Math.PI * 4,
        });
    }

    private onWindowResize(): void {
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    // Scroll functionality for Try Something New section
    scrollProducts(direction: 'left' | 'right'): void {
        const grid = document.querySelector('.try-new-grid') as HTMLElement;
        if (!grid) return;

        const scrollAmount = 400; // Pixels to scroll
        const currentScroll = grid.scrollLeft;

        const targetScroll = direction === 'left'
            ? currentScroll - scrollAmount
            : currentScroll + scrollAmount;

        grid.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
        });
    }

    // Navigate to category page
    navigateToCategory(category: string): void {
        this.router.navigate(['/category', category]);
    }

    // Navigate to Kitchen/Vendor page
    navigateToKitchen(product: Product): void {
        // Handle both populated object and string ID
        const vendorId = typeof product.vendor_id === 'object' ? product.vendor_id._id : product.vendor_id;
        if (vendorId) {
            this.router.navigate(['/kitchen', vendorId]);
        }
    }
}
