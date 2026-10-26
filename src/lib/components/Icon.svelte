<script lang="ts" module>
	import ArrowBackUp from '@tabler/icons-svelte/icons/arrow-back-up';
	import ArrowLeft from '@tabler/icons-svelte/icons/arrow-left';
	import ArrowRight from '@tabler/icons-svelte/icons/arrow-right';
	import ArrowUp from '@tabler/icons-svelte/icons/arrow-up';
	import ArrowsLeftRight from '@tabler/icons-svelte/icons/arrows-left-right';
	import Calendar from '@tabler/icons-svelte/icons/calendar';
	import Cards from '@tabler/icons-svelte/icons/cards';
	import Check from '@tabler/icons-svelte/icons/check';
	import Clock from '@tabler/icons-svelte/icons/clock';
	import ChevronDown from '@tabler/icons-svelte/icons/chevron-down';
	import ChevronLeft from '@tabler/icons-svelte/icons/chevron-left';
	import ChevronRight from '@tabler/icons-svelte/icons/chevron-right';
	import CircleCheck from '@tabler/icons-svelte/icons/circle-check';
	import ArrowsSplit from '@tabler/icons-svelte/icons/arrows-split';
	import Confetti from '@tabler/icons-svelte/icons/confetti';
	import DoorExit from '@tabler/icons-svelte/icons/door-exit';
	import FileTypePdf from '@tabler/icons-svelte/icons/file-type-pdf';
	import HelpCircle from '@tabler/icons-svelte/icons/help-circle';
	import Keyboard from '@tabler/icons-svelte/icons/keyboard';
	import Home from '@tabler/icons-svelte/icons/home';
	import List from '@tabler/icons-svelte/icons/list';
	import Logout from '@tabler/icons-svelte/icons/logout';
	import Mail from '@tabler/icons-svelte/icons/mail';
	import Pencil from '@tabler/icons-svelte/icons/pencil';
	import Plus from '@tabler/icons-svelte/icons/plus';
	import Receipt from '@tabler/icons-svelte/icons/receipt';
	import Search from '@tabler/icons-svelte/icons/search';
	import Settings from '@tabler/icons-svelte/icons/settings';
	import Share2 from '@tabler/icons-svelte/icons/share-2';
	import ShoppingCart from '@tabler/icons-svelte/icons/shopping-cart';
	import Sparkles from '@tabler/icons-svelte/icons/sparkles';
	import Trash from '@tabler/icons-svelte/icons/trash';
	import Upload from '@tabler/icons-svelte/icons/upload';
	import User from '@tabler/icons-svelte/icons/user';
	import UserMinus from '@tabler/icons-svelte/icons/user-minus';
	import UserPlus from '@tabler/icons-svelte/icons/user-plus';
	import Users from '@tabler/icons-svelte/icons/users';
	import X from '@tabler/icons-svelte/icons/x';

	/** Icons of the app's own UI, bundled. */
	const icons = {
		home: Home,
		users: Users,
		swipe: Cards,
		list: List,
		user: User,
		userPlus: UserPlus,
		userMinus: UserMinus,
		plus: Plus,
		back: ChevronLeft,
		check: Check,
		clock: Clock,
		x: X,
		done: CircleCheck,
		undo: ArrowBackUp,
		share: Share2,
		arrowUp: ArrowUp,
		arrowLeft: ArrowLeft,
		arrowRight: ArrowRight,
		help: HelpCircle,
		keyboard: Keyboard,
		direct: ArrowsLeftRight,
		mail: Mail,
		receipt: Receipt,
		cart: ShoppingCart,
		upload: Upload,
		logout: Logout,
		party: Confetti,
		calendar: Calendar,
		chevronDown: ChevronDown,
		chevronRight: ChevronRight,
		leave: DoorExit,
		pdf: FileTypePdf,
		edit: Pencil,
		search: Search,
		settings: Settings,
		sparkles: Sparkles,
		trash: Trash,
		split: ArrowsSplit
	};
	export type IconName = keyof typeof icons;
</script>

<script lang="ts">
	/**
	 * `name` is either a UI icon from the list above or any Tabler icon name chosen by a user
	 * (groups, expenses); the latter is loaded from /icons/<name>.svg and drawn as a mask so it
	 * takes the current text colour.
	 */
	let {
		name,
		size = 22,
		stroke = 1.8
	}: { name: IconName | (string & {}); size?: number; stroke?: number } = $props();
	const Component = $derived(icons[name as IconName]);
</script>

{#if Component}
	<Component {size} {stroke} aria-hidden="true" />
{:else}
	<span
		class="mask"
		aria-hidden="true"
		style:width="{size}px"
		style:height="{size}px"
		style:--src="url(/icons/{encodeURIComponent(name)}.svg)"
	></span>
{/if}

<style>
	.mask {
		display: inline-block;
		flex: none;
		background: currentColor;
		mask: var(--src) center / contain no-repeat;
		-webkit-mask: var(--src) center / contain no-repeat;
	}
</style>
