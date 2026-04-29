package diagram

var registeredDialects = map[Dialect]struct{}{}

func RegisterDialect(dialect Dialect) {
	registeredDialects[dialect] = struct{}{}
}

func IsRegisteredDialect(dialect Dialect) bool {
	_, ok := registeredDialects[dialect]
	return ok
}

