<script lang="ts" module>
	import ArrowBackUp from '@tabler/icons-svelte/icons/arrow-back-up';
	import ArrowUp from '@tabler/icons-svelte/icons/arrow-up';
	import ArrowsLeftRight from '@tabler/icons-svelte/icons/arrows-left-right';
	import BallFootball from '@tabler/icons-svelte/icons/ball-football';
	import Beach from '@tabler/icons-svelte/icons/beach';
	import Beer from '@tabler/icons-svelte/icons/beer';
	import Briefcase from '@tabler/icons-svelte/icons/briefcase';
	import Car from '@tabler/icons-svelte/icons/car';
	import Cards from '@tabler/icons-svelte/icons/cards';
	import Check from '@tabler/icons-svelte/icons/check';
	import Calendar from '@tabler/icons-svelte/icons/calendar';
	import ChevronDown from '@tabler/icons-svelte/icons/chevron-down';
	import ChevronRight from '@tabler/icons-svelte/icons/chevron-right';
	import DoorExit from '@tabler/icons-svelte/icons/door-exit';
	import FileTypePdf from '@tabler/icons-svelte/icons/file-type-pdf';
	import Pencil from '@tabler/icons-svelte/icons/pencil';
	import Settings from '@tabler/icons-svelte/icons/settings';
	import Sparkles from '@tabler/icons-svelte/icons/sparkles';
	import Trash from '@tabler/icons-svelte/icons/trash';
	import ChevronLeft from '@tabler/icons-svelte/icons/chevron-left';
	import CircleCheck from '@tabler/icons-svelte/icons/circle-check';
	import Confetti from '@tabler/icons-svelte/icons/confetti';
	import Heart from '@tabler/icons-svelte/icons/heart';
	import Home from '@tabler/icons-svelte/icons/home';
	import List from '@tabler/icons-svelte/icons/list';
	import Logout from '@tabler/icons-svelte/icons/logout';
	import Mail from '@tabler/icons-svelte/icons/mail';
	import Plane from '@tabler/icons-svelte/icons/plane';
	import Plus from '@tabler/icons-svelte/icons/plus';
	import Receipt from '@tabler/icons-svelte/icons/receipt';
	import Share2 from '@tabler/icons-svelte/icons/share-2';
	import ShoppingCart from '@tabler/icons-svelte/icons/shopping-cart';
	import Tent from '@tabler/icons-svelte/icons/tent';
	import ToolsKitchen2 from '@tabler/icons-svelte/icons/tools-kitchen-2';
	import Upload from '@tabler/icons-svelte/icons/upload';
	import User from '@tabler/icons-svelte/icons/user';
	import UserPlus from '@tabler/icons-svelte/icons/user-plus';
	import Users from '@tabler/icons-svelte/icons/users';

	import type { GroupIcon } from '../group-icons.ts';

	const groupIcons: Record<GroupIcon, typeof Home> = {
		home: Home,
		users: Users,
		heart: Heart,
		plane: Plane,
		beach: Beach,
		tent: Tent,
		car: Car,
		cart: ShoppingCart,
		kitchen: ToolsKitchen2,
		beer: Beer,
		briefcase: Briefcase,
		football: BallFootball
	};

	const icons = {
		...groupIcons,
		swipe: Cards,
		list: List,
		user: User,
		userPlus: UserPlus,
		plus: Plus,
		back: ChevronLeft,
		check: Check,
		done: CircleCheck,
		undo: ArrowBackUp,
		share: Share2,
		arrowUp: ArrowUp,
		direct: ArrowsLeftRight,
		mail: Mail,
		receipt: Receipt,
		upload: Upload,
		logout: Logout,
		party: Confetti,
		calendar: Calendar,
		chevronDown: ChevronDown,
		chevronRight: ChevronRight,
		leave: DoorExit,
		pdf: FileTypePdf,
		edit: Pencil,
		settings: Settings,
		sparkles: Sparkles,
		trash: Trash
	};
	export type IconName = keyof typeof icons;
</script>

<script lang="ts">
	let {
		name,
		size = 22,
		stroke = 1.8
	}: { name: IconName | string; size?: number; stroke?: number } = $props();
	const Component = $derived.by(() => {
		const found = icons[name as IconName];
		if (!found && import.meta.env.DEV) console.error(`Icon "${name}" is not registered`);
		return found ?? Users;
	});
</script>

<Component {size} {stroke} aria-hidden="true" />
