@interface SLController : NSDocumentController <NSApplicationDelegate, NSTableViewDataSource, NSTableViewDelegate>
{
	@private
	IBOutlet NSWindow *window;
	IBOutlet NSTableView *tableView;
	IBOutlet NSTableColumn *closeColumn;
	IBOutlet NSTableColumn *fileColumn;
	IBOutlet NSPopUpButton *browserPopUp;
	NSTask *_node;
	NSMutableArray *_openPaths;
}

- (IBAction)revealInBrowser:(id)sender;
- (IBAction)revealInFinder:(id)sender;
- (IBAction)closeFiles:(id)sender;
- (IBAction)closeFile:(id)sender;
- (IBAction)showWindow:(id)sender;

- (void)rescan;
- (BOOL)showPath:(NSString *const)p;

@end
