#import "SLController.h"
#import "PGAttachments.h"

static NSString *const SLDataPath = @"/Users/ben/Library/Application Support/SequentialWeb";
static NSString *const SLOpenPath = @"/Users/ben/Library/Application Support/SequentialWeb/open";

NS_INLINE BOOL BTEqualObjects(id<NSObject> const a, id<NSObject> const b)
{
	if(a == b) return YES;
	if(!a || !b) return NO;
	return [a isEqual:b];
}

static NSArray *SLURLsFromPaths(NSArray *const paths)
{
	NSMutableArray *const URLs = [NSMutableArray array];
	for(NSString *const p in paths) [URLs addObject:[NSURL fileURLWithPath:p]];
	return URLs;
}
static NSIndexSet *SLIndexesOfItemsInArray(NSArray *const a, NSArray *const b)
{
	NSMutableIndexSet *const s = [NSMutableIndexSet indexSet];
	for(id const obj in b) {
		NSUInteger const i = [a indexOfObject:obj];
		if(NSNotFound != i) [s addIndex:i];
	}
	return s;
}
static NSImage *SLCloseIcon(void)
{
	NSImage *const i = [[NSImage alloc] initWithSize:NSMakeSize(16.0, 16.0)];
	[i lockFocus];
	[[NSColor clearColor] set];
	NSRectFill(NSMakeRect(0.0, 0.0, 16.0, 16.0));
	[[NSColor colorWithDeviceWhite:0.0 alpha:0.25] set];
	[[NSBezierPath bezierPathWithOvalInRect:NSMakeRect(0.0, 0.0, 16.0, 16.0)] fill];
	[[NSColor whiteColor] set];
	[NSBezierPath setDefaultLineWidth:2.0];
	[NSBezierPath strokeLineFromPoint:NSMakePoint(5.0, 5.0) toPoint:NSMakePoint(11.0, 11.0)];
	[NSBezierPath strokeLineFromPoint:NSMakePoint(5.0, 11.0) toPoint:NSMakePoint(11.0, 5.0)];
	[i unlockFocus];
	return i;
}
static NSString *SLOpenPathForPath(NSString *const p)
{
	NSFileManager *const fm = [NSFileManager defaultManager];
	if(BTEqualObjects(@"/", p)) {
		if([fm fileExistsAtPath:[SLOpenPath stringByAppendingPathExtension:@"open"]]) return p;
		return nil;
	}
	NSString *const ancestor = SLOpenPathForPath([p stringByDeletingLastPathComponent]);
	if(ancestor) return ancestor;
	if([fm fileExistsAtPath:[SLOpenPath stringByAppendingString:[p stringByAppendingPathExtension:@"open"]]]) return p;
	return nil;
}
static BOOL SLFolderHasItems(NSString *const p)
{
	for(NSString *const path in [[NSFileManager defaultManager] enumeratorAtPath:p]) return YES; // TODO: Skip invisible files.
	return NO;
}
static void SLRemoveEmptyFolders(NSString *const p)
{
	if(SLFolderHasItems([SLOpenPath stringByAppendingString:p])) return;
	if(![[NSFileManager defaultManager] removeItemAtPath:[SLOpenPath stringByAppendingString:p] error:NULL]) return;
	SLRemoveEmptyFolders([p stringByDeletingLastPathComponent]);
}

@interface SLController(Private)

- (BOOL)_openURLs:(NSArray *const)URLs;
- (void)_closePaths:(NSArray *const)paths;

@end

@implementation SLController

#pragma mark -SLController

- (IBAction)revealInBrowser:(id const)sender
{
	for(NSString *const p in [_openPaths objectsAtIndexes:[tableView selectedRowIndexes]]) {
		[self showPath:p];
	}
}
- (IBAction)revealInFinder:(id const)sender
{
	for(NSString *const p in [_openPaths objectsAtIndexes:[tableView selectedRowIndexes]]) {
		[[NSWorkspace sharedWorkspace] selectFile:p inFileViewerRootedAtPath:nil];
	}
}
- (IBAction)closeFiles:(id const)sender
{
	[self _closePaths:[_openPaths objectsAtIndexes:[tableView selectedRowIndexes]]];
}
- (IBAction)closeFile:(id const)sender
{
	[self _closePaths:[NSArray arrayWithObject:[[sender selectedCell] representedObject]]];
}
- (IBAction)showWindow:(id)sender
{
	[window makeKeyAndOrderFront:sender];
}

#pragma mark -

- (void)rescan
{
	[_openPaths release];
	_openPaths = [[NSMutableArray alloc] init];
	NSFileManager *const fm = [NSFileManager defaultManager];
	if([fm fileExistsAtPath:[SLOpenPath stringByAppendingPathExtension:@"open"]]) {
		[_openPaths addObject:@"/"];
	}
	NSDirectoryEnumerator *const dirs = [fm enumeratorAtPath:SLOpenPath];
	for(NSString *const path in dirs) {
		if([path hasSuffix:@".open"]) [_openPaths addObject:[@"/" stringByAppendingString:[path stringByDeletingPathExtension]]];
	}
	[_openPaths sortUsingSelector:@selector(compare:)]; // TODO: Use smarter sorting.
	[tableView reloadData];
}
- (BOOL)showPath:(NSString *const)p
{
	NSURL *const URL = [NSURL URLWithString:[NSString stringWithFormat:@"http://%@:8001/file%@", [[NSProcessInfo processInfo] hostName], [p stringByAddingPercentEscapesUsingEncoding:NSUTF8StringEncoding]]]; // TODO: Don't hardcode the port.
	if(!URL) return NO;
	return [[NSWorkspace sharedWorkspace] openURLs:[NSArray arrayWithObject:URL] withAppBundleIdentifier:@"org.chromium.Chromium" options:NSWorkspaceLaunchDefault additionalEventParamDescriptor:nil launchIdentifiers:NULL]; // [[browserPopUp selectedItem] representedObject]
}

#pragma mark -SLController<NSTableViewDataSource>

- (NSInteger)numberOfRowsInTableView:(NSTableView *const)sender
{
	return [_openPaths count];
}
- (id)tableView:(NSTableView *const)sender objectValueForTableColumn:(NSTableColumn *const)col row:(NSInteger const)row
{
	return col == fileColumn ? [_openPaths objectAtIndex:row] : nil;
}

#pragma mark -SLController<NSTableViewDelegate>

- (BOOL)tableView:(NSTableView *const)sender shouldTrackCell:(NSCell *const)cell forTableColumn:(NSTableColumn *const)col row:(NSInteger const)row
{
	return YES; // Required for double clicking.
}
- (void)tableView:(NSTableView *const)sender willDisplayCell:(id const)cell forTableColumn:(NSTableColumn *const)col row:(NSInteger const)row
{
	if(col == closeColumn) [cell setRepresentedObject:[_openPaths objectAtIndex:row]];
}

- (NSDragOperation)tableView:(NSTableView *const)sender validateDrop:(id<NSDraggingInfo> const)info proposedRow:(NSInteger const)row proposedDropOperation:(NSTableViewDropOperation const)op
{
	[sender setDropRow:-1 dropOperation:NSTableViewDropOn];
	return NSDragOperationGeneric;
}
- (BOOL)tableView:(NSTableView *const)sender acceptDrop:(id<NSDraggingInfo> const)info row:(NSInteger const)row dropOperation:(NSTableViewDropOperation const)op
{
	NSPasteboard *const b = [info draggingPasteboard];
	return [self _openURLs:SLURLsFromPaths([b propertyListForType:NSFilenamesPboardType])];
}

#pragma mark -SLController<NSApplicationDelegate>

- (BOOL)applicationOpenUntitledFile:(NSApplication *const)sender
{
	[window makeKeyAndOrderFront:sender];
	return YES;
}
- (void)application:(NSApplication *const)sender openFiles:(NSArray *const)filenames
{
	[NSApp replyToOpenOrPrint:[self _openURLs:SLURLsFromPaths(filenames)] ? NSApplicationDelegateReplySuccess : NSApplicationDelegateReplyFailure];
}

- (void)applicationWillFinishLaunching:(NSNotification *const)notif
{
}
- (void)applicationDidFinishLaunching:(NSNotification *const)notif
{
}
- (void)applicationWillTerminate:(NSNotification *const)notif
{
	[_node terminate];
}

#pragma mark -SLController(Private)

- (BOOL)_openURLs:(NSArray *const)URLs
{
	NSMutableArray *const openedPaths = [NSMutableArray array];
	for(NSURL *const URL in URLs) {
		[self noteNewRecentDocumentURL:URL];

		NSString *const filename = [URL path];
		NSString *const ancestor = SLOpenPathForPath(filename);
		if(ancestor) {
			[self showPath:filename];
			[openedPaths addObject:ancestor];
			continue;
		}

		NSFileManager const *fm = [NSFileManager defaultManager];
		NSError *error = nil;
		NSString *openPath = nil;
		if(BTEqualObjects(@"/", filename)) {
			openPath = [SLOpenPath stringByAppendingPathExtension:@"open"];
		} else {
			if(![fm createDirectoryAtPath:[SLOpenPath stringByAppendingString:[filename stringByDeletingLastPathComponent]] withIntermediateDirectories:YES attributes:nil error:&error]) {
				NSLog(@"Error opening file: %@", error);
				continue;
			}
			openPath = [SLOpenPath stringByAppendingString:[filename stringByAppendingPathExtension:@"open"]];
		}
		if(![[NSData data] writeToFile:openPath options:kNilOptions error:&error]) {
			NSLog(@"Error opening file: %@", error);
			continue;
		}

		[_openPaths addObject:filename];
		[openedPaths addObject:filename];
		(void)[self showPath:filename];
	}

	[_openPaths sortUsingSelector:@selector(compare:)]; // TODO: Use smarter sorting.
	[tableView reloadData];
	[tableView selectRowIndexes:SLIndexesOfItemsInArray(_openPaths, openedPaths) byExtendingSelection:NO];
	NSUInteger const i = [_openPaths indexOfObject:[openedPaths lastObject]];
	if(NSNotFound != i) [tableView scrollRowToVisible:i];
	return YES;
}
- (void)_closePaths:(NSArray *const)paths
{
	NSFileManager *const fm = [NSFileManager defaultManager];
	for(NSString *const p in paths) {
		NSString *openPath = nil;
		if(BTEqualObjects(@"/", p)) {
			openPath = [SLOpenPath stringByAppendingPathExtension:@"open"];
		} else {
			openPath = [SLOpenPath stringByAppendingString:[p stringByAppendingPathExtension:@"open"]];
		}
		if([fm removeItemAtPath:openPath error:NULL]) {
			SLRemoveEmptyFolders([p stringByDeletingLastPathComponent]);
		}
	}
	[_openPaths removeObjectsInArray:paths];
	[tableView reloadData];
	[tableView selectRowIndexes:[NSIndexSet indexSet] byExtendingSelection:NO];
}

#pragma mark -NSDocumentController

- (NSInteger)runModalOpenPanel:(NSOpenPanel *const)openPanel forTypes:(NSArray *const)types
{
	[openPanel setCanChooseDirectories:YES];
	return [super runModalOpenPanel:openPanel forTypes:types];
}
- (IBAction)openDocument:(id)sender
{
	[self _openURLs:[self URLsFromRunningOpenPanel]];
}

#pragma mark -NSObject

- (void)dealloc
{
	[_node release];
	[super dealloc];
}

#pragma mark -NSObject(NSMenuValidation)

- (BOOL)validateMenuItem:(NSMenuItem *const)item
{
	SEL const action = [item action];
	if(![[tableView selectedRowIndexes] count]) {
		if(@selector(revealInBrowser:) == action) return NO;
		if(@selector(revealInFinder:) == action) return NO;
		if(@selector(closeFiles:) == action) return NO;
	}
	if(@selector(showWindow:) == action) {
		[item setState:[window isKeyWindow] ? NSOnState : NSOffState];
	}
	return [self respondsToSelector:action];
}

#pragma mark -NSObject(NSNibAwaking)

- (void)awakeFromNib
{
	[window setExcludedFromWindowsMenu:YES];

	_node = [[NSTask alloc] init];
	[_node setLaunchPath:@"/usr/local/bin/node"];
	[_node setArguments:[NSArray arrayWithObject:@"/Users/ben/Desktop/SequentialWeb/server/server.js"]];
	[_node launch];

	[[closeColumn dataCell] setImage:SLCloseIcon()];

	[tableView registerForDraggedTypes:[NSArray arrayWithObjects:
		NSFilenamesPboardType,
		nil]];


	NSMenu *const m = [browserPopUp menu];
	NSMutableSet *const identSet = [NSMutableSet setWithArray:[(id)LSCopyAllHandlersForURLScheme((CFStringRef)@"http") autorelease]];
	[identSet intersectSet:[NSSet setWithArray:[(id)LSCopyAllHandlersForURLScheme((CFStringRef)@"https") autorelease]]];
	NSString *const def = [(id)LSCopyDefaultHandlerForURLScheme((CFStringRef)@"https") autorelease];
	NSMutableArray *const items = [NSMutableArray array];
	for(NSString *const ident in identSet) {
		NSURL *const appURL = [[NSWorkspace sharedWorkspace] URLForApplicationWithBundleIdentifier:ident];
		if(![appURL isFileURL]) continue;
		NSString *const appPath = [appURL path];
		NSString *appName = SLDisplayName(appPath);
		if([appName hasSuffix:@".app"]) appName = [appName stringByDeletingPathExtension];

		NSMenuItem *const item = [[[NSMenuItem alloc] init] autorelease];
		[item setAttributedTitle:[NSAttributedString PG_attributedStringWithFileIcon:[[NSWorkspace sharedWorkspace] iconForFile:appPath] name:appName]];
		[item setRepresentedObject:ident];
		[items addObject:item];
	}
	[items sortWithOptions:kNilOptions usingComparator:^(NSMenuItem *const a, NSMenuItem *const b) {
		return [[[a attributedTitle] string] compare:[[b attributedTitle] string]];
	}];
	for(NSMenuItem *const item in items) {
		[m addItem:item];
		if(BTEqualObjects(def, [item representedObject])) [browserPopUp selectItem:item];
	}


	[self rescan];

	[super awakeFromNib];
}

@end
